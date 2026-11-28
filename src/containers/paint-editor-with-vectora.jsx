import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import BasePaintEditor from './tw-paint-editor-wrapper.jsx';
import VectoraEditor from '../components/vectora-editor/vectora-editor.jsx';
import styles from './paint-editor-with-vectora.css';

// 宿主 Scratch 语言（与 LanguageService / vectora-editor 一致的 key，保证整站切换联动）
function hostLangKey () {
    try {
        var stored = localStorage.getItem('tw:language') || localStorage.getItem('currentLocale') || '';
        var htmlLang = (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) || '';
        var base = (stored || htmlLang || 'en').split('-')[0].toLowerCase();
        return base === 'zh' ? 'zh' : 'en';
    } catch (e) {
        return 'en';
    }
}

/**
 * 外层包装：在原造型/背景画板之上新增「Editor」矢量画板切换。
 * - 原画笔功能完全保留，默认显示
 * - 编辑器切换下拉框作为行内控件嵌入「转换为位图 / 转换为矢量」按钮右侧同一栏（画布底部工具栏），
 *   不再浮动遮盖画板；两种模式下都可见，可随时切回
 * - 双向实时同步枢纽：
 *   1) 维护权威 SVG(liveSvg)：Scratch 画板每次回写都缓存下来，切到 Editor 时用它初始化，
 *      不再依赖可能过期的 props.image（GUI 的 shouldComponentUpdate 只比 imageId，编辑内容时不变）
 *   2) Vectora 编辑回写时更新 liveSvg 并递增 syncKey，强制 Scratch 画板(paper-canvas)重载最新内容
 *   3) 用 source 标记区分回写来源，避免「Editor→宿主→Editor」回环与撤销栈被重置
 * - 主题与原编辑器保持一致（dark/light）
 */
class PaintEditorWithVectora extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            showVectora: false,
            liveSvg: typeof props.image === 'string' ? props.image : '',
            syncKey: 0,
            source: 'host' // 'host' | 'scratch' | 'vectora'
        };
        this.handleScratchUpdate = this.handleScratchUpdate.bind(this);
        this.handleVectoraUpdate = this.handleVectoraUpdate.bind(this);
        this.handleClassic = this.handleClassic.bind(this);
        this.handleVectora = this.handleVectora.bind(this);
        this.handleModeChange = this.handleModeChange.bind(this);
    }

    componentDidUpdate (prevProps) {
        // 切换造型/角色：用宿主的全新 image 重置权威缓存
        if (prevProps.imageId !== this.props.imageId) {
            this.setState({
                liveSvg: typeof this.props.image === 'string' ? this.props.image : '',
                source: 'host'
            });
        } else if (typeof this.props.image === 'string' &&
                   this.props.image !== prevProps.image &&
                   this.state.source !== 'scratch') {
            // 宿主 image 被外部更新（撤销/重做/外部改造型），且不是我们刚写的 Scratch 内容 -> 采纳
            this.setState({liveSvg: this.props.image, source: 'host'});
        }
    }

    // Scratch 原生画板编辑回写：缓存最新 SVG，同时照常写入 VM
    handleScratchUpdate (isVector, image, rotationCenterX, rotationCenterY) {
        if (isVector && typeof image === 'string') {
            this.setState({liveSvg: image, source: 'scratch'});
        }
        this.props.onUpdateImage(isVector, image, rotationCenterX, rotationCenterY);
    }

    // Editor(Vectora) 编辑回写：更新权威 SVG + 递增 syncKey 强制 Scratch 画板重载
    handleVectoraUpdate (isVector, svg, rotationCenterX, rotationCenterY) {
        if (isVector && typeof svg === 'string') {
            this.setState(state => ({
                liveSvg: svg,
                source: 'vectora',
                syncKey: state.syncKey + 1
            }));
        }
        this.props.onUpdateImage(isVector, svg, rotationCenterX, rotationCenterY);
    }

    handleClassic () {
        this.setState({showVectora: false});
    }

    handleVectora () {
        this.setState({showVectora: true});
    }

    handleModeChange (event) {
        if (event.target.value === 'editor') this.handleVectora();
        else this.handleClassic();
    }

    renderModeControls (theme) {
        const {showVectora} = this.state;
        const zh = hostLangKey() === 'zh';
        return (
            <div className={classNames(styles.modeControls, styles.inline, styles.onTop, styles[theme])}>
                <span className={styles.dockLabel}>{zh ? '编辑器' : 'Editor'}</span>
                <select
                    className={classNames(styles.modeSelect, styles[theme])}
                    value={showVectora ? 'editor' : 'scratch'}
                    title={zh ? '切换造型画板：Scratch 画笔或 Editor（矢量设计工作室）' : 'Switch paint editor: Scratch or Editor (vector design studio)'}
                    aria-label={zh ? '造型画板' : 'Paint editor'}
                    onChange={this.handleModeChange}
                >
                    <option value="scratch">Scratch</option>
                    <option value="editor">{zh ? '编辑器（矢量）' : 'Editor (Vector)'}</option>
                </select>
            </div>
        );
    }

    render () {
        const {showVectora, liveSvg, syncKey, source} = this.state;
        const theme = this.props.theme === 'light' || this.props.theme === 'dark' ? this.props.theme : 'dark';
        const image = liveSvg || this.props.image;
        // imageId 带同步版本号：Vectora 编辑后强制 paper-canvas 重新载入权威 SVG
        const imageId = `${this.props.imageId || ''}-rw${syncKey}`;
        return (
            <div className={styles.wrapper}>
                <BasePaintEditor
                    {...this.props}
                    image={image}
                    imageId={imageId}
                    onUpdateImage={this.handleScratchUpdate}
                    modeControls={this.renderModeControls(theme)}
                />
                {showVectora ? (
                    <div className={classNames(styles.overlay, styles[theme])}>
                        <VectoraEditor
                            image={image}
                            imageId={imageId}
                            source={source}
                            name={this.props.name}
                            theme={theme}
                            rotationCenterX={this.props.rotationCenterX}
                            rotationCenterY={this.props.rotationCenterY}
                            onUpdateImage={this.handleVectoraUpdate}
                        />
                    </div>
                ) : null}
            </div>
        );
    }
}

PaintEditorWithVectora.propTypes = {
    image: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(HTMLImageElement)]),
    imageId: PropTypes.string,
    name: PropTypes.string,
    theme: PropTypes.string,
    rotationCenterX: PropTypes.number,
    rotationCenterY: PropTypes.number,
    onUpdateImage: PropTypes.func.isRequired
};

export default PaintEditorWithVectora;
