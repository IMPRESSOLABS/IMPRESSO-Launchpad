import { ConnectButton } from '@rainbow-me/rainbowkit';
import styles from '../../styles/Widget.module.scss';
import Form from './form/form';


export default function Widget() {
    return (
        <div className={styles['widget-body']}>
            <ConnectButton />
            <Form/>
        </div>
    );
}