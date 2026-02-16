import { Children } from 'react';
import styles from './button.module.scss';
import classNames from 'classnames';

export default function Button({children, className, ...props}) {
    return (
        <button className={classNames(className, styles.button)} {...props}>{children}</button>
    )
}