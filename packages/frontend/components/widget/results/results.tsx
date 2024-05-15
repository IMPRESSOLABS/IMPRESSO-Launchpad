import styles from "../../../styles/Widget.module.scss";
import { TResults } from "../form/form";


const shortenAddress = (st: string) => {
    return st.slice(0, 6) + "..." + st.slice(st.length - 6, st.length);
}


export default function Results(props: {
    results: TResults;
    setShowResults: (showResults: boolean) => void;
}) {
    const { results, setShowResults } = props;

    const handleCopyAddress = (addr: string) => {
        navigator.clipboard.writeText(addr);
    }

    return (
        <div className={styles["widget-results"]}>
            <div className={styles["widget-results-blocks"]}>
                <div className={styles["widget-results-block"]} onClick={e => handleCopyAddress(results.logicContractAddress)}>
                    <span>Logic contract address</span>
                    <span>{shortenAddress(results.logicContractAddress)}</span>
                </div>
                <div className={styles["widget-results-block-hash"]} onClick={e => handleCopyAddress(results.logicContractTxHash)}>
                    <span>Logic contract transaction hash</span>
                    <span>{shortenAddress(results.logicContractTxHash)}</span>
                </div>

                <div className={styles["widget-results-block"]} onClick={e => handleCopyAddress(results.proxyContractAddress)}>
                    <span>Proxy contract address</span>
                    <span>{shortenAddress(results.proxyContractAddress)}</span>
                </div>
                <div className={styles["widget-results-block-hash"]} onClick={e => handleCopyAddress(results.proxyContractTxHash)}>
                    <span>Proxy contract transaction hash</span>
                    <span>{shortenAddress(results.proxyContractTxHash)}</span>
                </div>
            </div>

            <button onClick={e => setShowResults(false)} className={styles["widget-results-back-btn"]}>Back to deployment form</button>
        </div>
    );
}