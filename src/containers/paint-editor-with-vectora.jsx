import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import BasePaintEditor from './tw-paint-editor-wrapper.jsx';
import VectoraEditor from '../components/vectora-editor/vectora-editor.jsx';
import styles from './paint-editor-with-vectora.css';

/**
 * 外层包装：在原造型/背景画板之上新增「Editor」矢量画板切换。
 * - 原画笔功能完全保留，默认显示
 * - 切换按钮作为行内控件放在左下角「转换位图/矢量图」按钮右侧（通过 props.modeControls 注入），不遮挡文字
 * - 两种模式的按钮始终都在同一位置：经典画板 / Editor 矢量画板
 * - Vectora 内编辑实时回写造型（onUpdateImage），舞台同步显示
 * - 主题与原编辑器保持一致（dark/light）
 */
class PaintEditorWithVectora extends React.Component {
    constructor (props) {
        super(props);
        this.state = {showVectora: false};
        this.handleClassic = this.handleClassic.bind(this);
        this.handleVectora = this.handleVectora.bind(this);
        this.handleModeChange = this.handleModeChange.bind(this);
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

    renderModeControls (theme, floating) {
        const {showVectora} = this.state;
        return (
            <span className={classNames(styles.modeControls, floating ? styles.floating : null, styles[theme])}>
                {floating ? <span className={styles.floatingLabel}>Editor</span> : null}
                <select
                    className={classNames(styles.modeSelect, styles[theme])}
                    value={showVectora ? 'editor' : 'scratch'}
                    title="Switch paint editor: Scratch or Editor (vector design studio)"
                    aria-label="Paint editor"
                    onChange={this.handleModeChange}
                >
                    <option value="scratch">Scratch</option>
                    <option value="editor">Editor (Vector)</option>
                </select>
            </span>
        );
    }

    render () {
        const {showVectora} = this.state;
        const theme = this.props.theme === 'light' || this.props.theme === 'dark' ? this.props.theme : 'dark';
        return (
            <div className={styles.wrapper}>
                <BasePaintEditor
                    {...this.props}
                    modeControls={this.renderModeControls(theme)}
                />
                {/* 显眼的浮动切换条：任何模式下都在画板右上角可见，可随时切回 Scratch 或进入 Editor。
                    z-index 高于矢量画板浮层，避免切换后找不到入口。 */}
                {this.renderModeControls(theme, true)}
                {showVectora ? (
                    <div className={classNames(styles.overlay, styles[theme])}>
                        <VectoraEditor
                            image={this.props.image}
                            imageId={this.props.imageId}
                            name={this.props.name}
                            theme={theme}
                            rotationCenterX={this.props.rotationCenterX}
                            rotationCenterY={this.props.rotationCenterY}
                            onUpdateImage={this.props.onUpdateImage}
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
