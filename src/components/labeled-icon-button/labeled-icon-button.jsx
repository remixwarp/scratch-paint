/* @todo This file should be pulled out into a shared library with scratch-gui,
consolidating this component with icon-button.jsx in gui.
See #13 */

import classNames from 'classnames';
import React from 'react';
import PropTypes from 'prop-types';

import Button from '../button/button.jsx';

import styles from './labeled-icon-button.css';

const renderIcon = icon => {
    if (!icon) return null;

    if (React.isValidElement(icon)) {
        return React.cloneElement(icon, {
            className: classNames(
                styles.editFieldIcon,
                icon.props.className
            ),
            stroke: 'var(--looks-secondary)'
        });
    }

    return React.createElement(icon, {
        className: styles.editFieldIcon,
        stroke: 'var(--looks-secondary)'
    });
};

const LabeledIconButton = ({
    className,
    hideLabel,
    imgAlt,
    imgSrc,
    icon,
    onClick,
    title,
    ...props
}) => {
    let iconElement = null;

    if (imgSrc) {
        iconElement = (
            <img
                alt={imgAlt || title}
                className={styles.editFieldIcon}
                draggable={false}
                src={imgSrc}
                title={title}
            />
        );
    } else {
        iconElement = renderIcon(icon);
    }

    return (
        <Button
            className={classNames(className, styles.modEditField)}
            onClick={onClick}
            {...props}
        >
            {iconElement}
            {!hideLabel && (
                <span className={styles.editFieldTitle}>{title}</span>
            )}
        </Button>
    );
};

LabeledIconButton.propTypes = {
    className: PropTypes.string,
    hideLabel: PropTypes.bool,
    highlighted: PropTypes.bool,
    imgAlt: PropTypes.string,
    imgSrc: PropTypes.string,
    icon: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.object,
        PropTypes.node
    ]),
    onClick: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired
};

export default LabeledIconButton;
