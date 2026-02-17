import classNames from 'classnames';
import React from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';

import Button from '../button/button.jsx';
import styles from './tool-select-base.css';

const formatWithKeyBinding = (description, keybinding) => {
    if (!keybinding) return description;
    return `${description} (${keybinding})`;
};

const ToolSelectComponent = props => {
    const {
        icon,
        imgSrc,
        intl,
        imgDescriptor,
        keybinding,
        className,
        isSelected,
        disabled,
        onMouseDown
    } = props;

    let iconElement = null;

    if (icon) {
        if (React.isValidElement(icon)) {
            iconElement = React.cloneElement(icon, {
                size: 20,
                className: classNames(
                    styles.toolSelectIcon,
                    icon.props.className
                )
            });
        } else {
            iconElement = React.createElement(icon, {
                size: 20,
                className: styles.toolSelectIcon
            });
        }
    } else if (imgSrc) {
        iconElement = (
            <img
                alt={intl.formatMessage(imgDescriptor)}
                className={styles.toolSelectIcon}
                draggable={false}
                src={imgSrc}
            />
        );
    }

    return (
        <Button
            className={classNames(className, styles.modToolSelect, {
                [styles.isSelected]: isSelected
            })}
            disabled={disabled}
            title={formatWithKeyBinding(
                intl.formatMessage(imgDescriptor),
                keybinding
            )}
            onClick={onMouseDown}
        >
            <span
                className={styles.toolSelectIcon}
                aria-hidden
            >
                {iconElement}
            </span>
        </Button>
    );
};


ToolSelectComponent.propTypes = {
    className: PropTypes.string,
    disabled: PropTypes.bool,
    imgDescriptor: PropTypes.shape({
        defaultMessage: PropTypes.string,
        description: PropTypes.string,
        id: PropTypes.string
    }).isRequired,
    keybinding: PropTypes.string,
    icon: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.object,
        PropTypes.node
    ]),
    imgSrc: PropTypes.string,
    intl: intlShape.isRequired,
    isSelected: PropTypes.bool.isRequired,
    onMouseDown: PropTypes.func.isRequired
};

export default injectIntl(ToolSelectComponent);
