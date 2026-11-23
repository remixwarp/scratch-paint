import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import BasePaintEditor from './tw-paint-editor-wrapper.jsx';
import VectoraEditor from '../components/vectora-editor/vectora-editor.jsx';
import styles from './paint-editor-with-vectora.css';

/**
 * 外层包装：在原造型/背景画板之上新增「Editor」矢量画板切换。
 * - 原画笔功能完全保留，默认显示
 * - 点击右上「Editor」按钮切到 Vectora（完整功能，非精简），自动载入当前造型
 * - Vectora 内编辑实时回写造型（onUpdateImage），舞台同步显示
 * - 主题与原编辑器保持一致（dark/light）
 */
class PaintEditorWithVectora extends React.Component {
    constructor (props) {
        super(props);
        this.state = {showVectora: false};
        this.handleToggle = this.handleToggle.bind(this);
        this.handleBack = this.handleBack.bind(this);
    }

    handleToggle () {
        this.setState({showVectora: true});
    }

    handleBack () {
        this.setState({showVectora: false});
    }

    render () {
        const {showVectora} = this.state;
        const theme = this.props.theme === 'light' || this.props.theme === 'dark' ? this.props.theme : 'dark';
        return (
            <div className={styles.wrapper}>
                <BasePaintEditor {...this.props} />
                {showVectora ? (
                    <div className={classNames(styles.overlay, styles[theme])}>
                        <button
                            className={styles.backButton}
                            title="Back to the classic editor"
                            onClick={this.handleBack}
                        >
                            <span className={styles.backArrow}>‹</span>
                            <span>Scratch</span>
                        </button>
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
                ) : (
                    <button
                        className={classNames(styles.switchButton, styles[theme])}
                        title="Open Editor — full vector design studio"
                        onClick={this.handleToggle}
                    >
                        <span className={styles.switchDot}>✎</span>
                        <span>Editor</span>
                    </button>
                )}
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
