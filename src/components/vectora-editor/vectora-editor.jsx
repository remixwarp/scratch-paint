import React from 'react';
import PropTypes from 'prop-types';
import vectoraHtml from './vectora-html.js';

/**
 * Vectora 矢量画板：在 iframe 内加载完整改造版 Vectora，并通过 postMessage 与宿主造型编辑器双向同步。
 * - 打开时用当前造型 SVG 初始化 Vectora
 * - Vectora 内编辑（change/commit）后实时回传 SVG，宿主写回造型并在舞台显示
 * - 主题（dark/light）双向同步
 * 版权声明、logo 等在 vectora.html 内按需求处理，本组件不裁剪任何 Vectora 功能。
 */
class VectoraEditor extends React.Component {
    constructor (props) {
        super(props);
        this.handleMessage = this.handleMessage.bind(this);
        this.frameRef = null;
    }

    componentDidMount () {
        window.addEventListener('message', this.handleMessage);
        // iframe 的 onLoad 里会调用 sendInit，确保内容已就绪
    }

    componentWillUnmount () {
        window.removeEventListener('message', this.handleMessage);
    }

    componentDidUpdate (prevProps) {
        // 宿主主题变化时同步进 iframe
        if (prevProps.theme !== this.props.theme) {
            this.post({type: 'vectora:theme', theme: this.props.theme});
        }
        // 造型在外部被替换（如切换造型/撤销到其它造型）时，重新初始化
        if (prevProps.imageId !== this.props.imageId) {
            this._ready = false;
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
        this.post({
            type: 'vectora:init',
            svg: typeof image === 'string' ? image : '',
            theme: theme === 'light' || theme === 'dark' ? theme : 'dark',
            name: name || 'Costume'
        });
    }

    handleLoad () {
        this.sendInit();
    }

    handleMessage (event) {
        const d = event.data;
        if (!d || typeof d !== 'object') return;
        // 只接受来自本 iframe 的消息
        if (!this.frameRef || event.source !== this.frameRef.contentWindow) return;
        if (d.type === 'vectora:ready') {
            this._ready = true;
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
        // srcDoc 直接内联完整改造版 Vectora；用 raw-loader 文本导入，避免额外静态资源路径问题
        return (
            <iframe
                ref={ref => {
                    this.frameRef = ref;
                }}
                title="Editor"
                className={this.props.className}
                srcDoc={vectoraHtml}
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
    name: PropTypes.string,
    theme: PropTypes.string,
    rotationCenterX: PropTypes.number,
    rotationCenterY: PropTypes.number,
    onUpdateImage: PropTypes.func.isRequired,
    onThemeChange: PropTypes.func
};

export default VectoraEditor;
