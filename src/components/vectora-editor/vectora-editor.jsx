import React from 'react';
import PropTypes from 'prop-types';
import vectoraHtml from './vectora-html.js';
import dictSeedScript from '../../vectora/editor-i18n-dict';

/**
 * Vectora 矢量画板：在 iframe 内加载完整改造版 Vectora，并通过 postMessage 与宿主造型编辑器双向同步。
 * - 打开时用当前造型 SVG 初始化 Vectora
 * - Vectora 内编辑（change/commit）后实时回传 SVG，宿主写回造型并在舞台显示
 * - 主题（dark/light）双向同步
 * - 修复同步竞态：iframe 尚未 ready 时缓存待发送的 init，收到 vectora:boot/ready 后补发，
 *   避免大体积 srcDoc 脚本未就绪导致首帧 init 丢失（表现为「打开 Editor 不同步」）。
 * - 修复单向更新：Scratch 画板编辑后 image 内容变化也重新 init；source==='vectora' 的回写不再回灌，避免回环。
 * 版权声明、logo 等在 vectora.html 内按需求处理，本组件不裁剪任何 Vectora 功能。
 */
// 宿主 Scratch 语言：与 LanguageService 写入的 key 保持一致。
// iframe 内的运行时脚本看不到宿主 locale，因此翻译必须在宿主侧、srcDoc 注入前完成。
function hostLangKey () {
    try {
        var stored = localStorage.getItem('tw:language') || localStorage.getItem('currentLocale') || '';
        var htmlLang = (typeof document !== 'undefined' && document.documentElement &&
            document.documentElement.lang) || '';
        var raw = stored || htmlLang;
        var base = (raw || 'en').split('-')[0].toLowerCase();
        return base === 'zh' ? 'zh' : 'en';
    } catch (e) {
        return 'en';
    }
}

// 在 Vectora HTML 最前面注入宿主语言种子；Vectora 内的 v3 i18n 脚本启动时读取，
// 并在 onLoad / 语言变化时再用 postMessage 推送一次，双保险。
function buildSeededDoc () {
    try {
        var seed = '<script>window.__RW_SEED_LANG__=' + JSON.stringify(hostLangKey()) + ';<\/script>';
        // 注入来自 scratch-l10n 的权威 UI 词典（1844 条）。
        var dictSeed = dictSeedScript();
        if (dictSeed) seed = dictSeed + seed;
        return vectoraHtml.replace('<script>', seed + '<script>');
    } catch (e) {
        return vectoraHtml;
    }
}

class VectoraEditor extends React.Component {
    constructor (props) {
        super(props);
        this.handleMessage = this.handleMessage.bind(this);
        this.frameRef = null;
        this._uiLang = hostLangKey();
        this._ready = false;
        this._pendingInit = null;
        this._lastInitSvg = null;
    }

    componentDidMount () {
        window.addEventListener('message', this.handleMessage);
        // iframe 的 onLoad 里会调用 sendInit，确保内容已就绪
    }

    componentWillUnmount () {
        window.removeEventListener('message', this.handleMessage);
    }

    componentDidUpdate (prevProps) {
        // 宿主语言变化：用新语言静态重编译 srcDoc，并强制 iframe 重建（key 变化）。
        const langNow = hostLangKey();
        if (langNow !== this._uiLang) {
            this._uiLang = langNow;
            this.setState(prev => ({docVersion: (prev.docVersion || 0) + 1}));
            return;
        }
        // 宿主主题变化时同步进 iframe
        if (prevProps.theme !== this.props.theme) {
            this.post({type: 'vectora:theme', theme: this.props.theme});
        }
        // 造型在外部被替换、或 Scratch 画板编辑后（image 内容 / imageId 变化），重新初始化。
        // source==='vectora' 表示这是 Editor 自己刚写回的回写，不再回灌，避免回环/撤销栈重置。
        const imageChanged = prevProps.image !== this.props.image;
        const idChanged = prevProps.imageId !== this.props.imageId;
        if ((imageChanged || idChanged) && this.props.source !== 'vectora') {
            this.sendInit();
        }
    }

    post (msg) {
        if (this.frameRef && this.frameRef.contentWindow) {
            try {
                this.frameRef.contentWindow.postMessage(msg, '*');
            } catch (e) {
                // ignore
            }
        }
    }

    sendInit () {
        const {image, theme, name} = this.props;
        const svg = typeof image === 'string' ? image : '';
        const msg = {
            type: 'vectora:init',
            svg,
            theme: theme === 'light' || theme === 'dark' ? theme : 'dark',
            name: name || 'Costume'
        };
        if (!this._ready) {
            // iframe 脚本尚未就绪：缓存，收到 ready/boot 后补发，避免首帧 init 丢失
            this._pendingInit = msg;
            return;
        }
        // 去重：boot 与 onLoad 都会在首帧触发，避免重复 loadDocument
        if (this._lastInitSvg === svg) return;
        this._lastInitSvg = svg;
        this.post(msg);
    }

    handleLoad () {
        this.sendInit();
        this.post({type: 'studio:set-lang', lang: hostLangKey()});
    }

    handleMessage (event) {
        const d = event.data;
        if (!d || typeof d !== 'object') return;
        // 只接受来自本 iframe 的消息
        if (!this.frameRef || event.source !== this.frameRef.contentWindow) return;
        if (d.type === 'vectora:ready' || d.type === 'vectora:boot') {
            this._ready = true;
            if (this._pendingInit) {
                const pending = this._pendingInit;
                this._pendingInit = null;
                if (this._lastInitSvg !== pending.svg) {
                    this._lastInitSvg = pending.svg;
                    this.post(pending);
                }
            } else {
                // ready 时尚未 sendInit（例如 onLoad 先于脚本执行），主动初始化一次
                this.sendInit();
            }
        } else if (d.type === 'vectora:theme') {
            // Vectora 内切换主题 -> 通知宿主（可选扩展点）
            if (this.props.onThemeChange && (d.theme === 'light' || d.theme === 'dark')) {
                this.props.onThemeChange(d.theme);
            }
        } else if (d.type === 'vectora:update') {
            if (typeof d.svg === 'string' && d.svg) {
                // isVector=true 回写 SVG；旋转中心用画板中心，保证舞台定位与原造型一致
                const cx = Number(d.width) ? Number(d.width) / 2 : this.props.rotationCenterX;
                const cy = Number(d.height) ? Number(d.height) / 2 : this.props.rotationCenterY;
                this.props.onUpdateImage(true, d.svg, cx, cy);
            }
        }
    }

    render () {
        // 注入宿主语言种子（v3 i18n 脚本启动读取 + postMessage 兜底）。
        // key 绑定语言/版本，语言变化时强制 React 卸载旧 iframe、挂载新实例。
        const doc = buildSeededDoc();
        return (
            <iframe
                key={this._uiLang + '-' + (this.state.docVersion || 0)}
                ref={ref => {
                    this.frameRef = ref;
                }}
                title="Editor"
                className={this.props.className}
                srcDoc={doc}
                onLoad={() => this.handleLoad()}
                allow="fullscreen; autoplay"
            />
        );
    }
}

VectoraEditor.propTypes = {
    className: PropTypes.string,
    image: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(HTMLImageElement)]),
    imageId: PropTypes.string,
    source: PropTypes.string,
    name: PropTypes.string,
    theme: PropTypes.string,
    rotationCenterX: PropTypes.number,
    rotationCenterY: PropTypes.number,
    onUpdateImage: PropTypes.func.isRequired,
    onThemeChange: PropTypes.func
};

export default VectoraEditor;
