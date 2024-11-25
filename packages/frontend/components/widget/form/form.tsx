/*
    Simple UI for the deployment scripts with input fields to select:
    a. Network (Arbitrum Nova + Arbitrum One + Sepolia testnet)
    b. token name +
    c. total supply +
    d. token type (Votable or not) +
    e. owner address --
    f. amount to be minted
    g. address to be minted on
*/
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import styles from "../../../styles/Widget.module.scss";
import { SubmitHandler, useForm } from "react-hook-form";

import impresso from "../../../contracts/Impresso.sol/Impresso.json";
import impressoVotable from "../../../contracts/ImpressoVotable.sol/ImpressoVotable.json";
import uupsProxy from "../../../contracts/UUPSProxy.sol/UUPSProxy.json";
import impressoAC from "../../../contracts/ImpressoAC.sol/ImpressoAC.json";
import impressoVotableAC from "../../../contracts/ImpressoVotableAC.sol/ImpressoVotableAC.json";

import { useState } from "react";
import { parseEther, encodeFunctionData } from "viem";
import Results from "../results/results";

import { Toaster, toast } from "react-hot-toast";

type Inputs = {
    Name: string;
    Symbol: string;
    TotalSupply: number;
    TokenType: "default" | "votable" | "accessControlDefault" | "accessControlVotable";
    AmountToMint: number;
    AddressToBeMinted: string;
    UseMaxTotalSupply: boolean;
}

export type TResults = {
    logicContractAddress: string;
    logicContractTxHash: string;
    proxyContractAddress: string;
    proxyContractTxHash: string;
}

const ethereumAddressRegex = /^(0x)?[0-9a-fA-F]{40}$/;

const isDisabled = (status: string, error: boolean) => {
    return !["Deploy", "Deployed!"].includes(status) && !error;
}


const getContractData = (name: Inputs["TokenType"]) => {
    switch (name) {
        case "default":
            return impresso;
        case "votable":
            return impressoVotable;
        case "accessControlDefault":
            return impressoAC;
        case "accessControlVotable":
            return impressoVotableAC;

        default:
            return impresso;
    }
}



export default function Form() {
    const { isConnected, address } = useAccount();
    const { register, reset, handleSubmit, getValues, formState: { errors } } = useForm<Inputs>();
    const [status, setStatus] = useState("Deploy");
    const [error, setError] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState<TResults | null>(null);
    const [useMaxTotalSupply, setUseMaxTotalSupply] = useState(false);
    const [isTransacting, setIsTransacting] = useState(false);

    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();


    const handleUseMaxTotalSupplyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUseMaxTotalSupply(e.target.checked);
    }


    const getRequiredConfirmations = (networkId: number) => {
        switch (networkId) {
            case 42161: // Arbitrum            
                return 20;
            case 421613: // Arbitrum Nova         
                return 15;
            default:
                return 5;
        }
    }

    const onSubmit: SubmitHandler<Inputs> = async (data) => {

        const networkId = 2;

        if (isTransacting) return;
        setIsTransacting(true);

        setError(false);

        // Add validation  
        if (!data.Name || !data.Symbol || !data.AddressToBeMinted) {
            setError(true);
            setStatus("Invalid input data");
            return;
        }
        // Validate amounts are positive    
        if (data.AmountToMint <= 0 || (data.TotalSupply && data.TotalSupply <= 0)) {
            setError(true);
            setStatus("Amount must be greater than 0");
            return;
        }


        try {
            const cData = getContractData(data.TokenType);
            // DEPLOY SELECTED CONTRACT
            setStatus("Deploying contract...");
            const txHash = await walletClient?.deployContract({
                abi: cData.abi,
                account: address,
                bytecode: cData.bytecode as `0x${string}`,
            });

            // WAIT FOR DEPLOYMENT FINISH
            const tx = await publicClient?.waitForTransactionReceipt({
                hash: txHash as `0x${string}`,
                confirmations: getRequiredConfirmations(networkId),
            });



            // proxy "initialize" function args array
            !data.TotalSupply && (data.TotalSupply = 0);
            const args = [data.Name, data.Symbol, parseEther("" + data.TotalSupply), data.UseMaxTotalSupply];

            // if we are deploying accessControl contract
            if (data.TokenType.includes("accessControl")) {
                args.push(address as string);
            }

            // DEPLOY PROXY
            setStatus("Deploying proxy...");
            const encodedDataAsInitializerArgs = encodeFunctionData({
                abi: cData.abi,
                functionName: 'initialize',
                args: args,
            });

            const txProxyHash = await walletClient?.deployContract({
                abi: uupsProxy.abi,
                account: address,
                bytecode: uupsProxy.bytecode as `0x${string}`,
                args: [tx?.contractAddress, encodedDataAsInitializerArgs],
            });

            // WAIT FOR PROXY DEPLOYMENT FINISH
            const txProxy = await publicClient?.waitForTransactionReceipt({
                hash: txProxyHash as `0x${string}`,
                confirmations: getRequiredConfirmations(networkId),
            });

            // MINT TOKENS
            setStatus("Minting tokens...");
            const txMintHash = await walletClient?.writeContract({
                account: address,
                address: txProxy?.contractAddress as `0x${string}`,
                abi: cData.abi,
                functionName: 'mint',
                args: [data.AddressToBeMinted, parseEther("" + data.AmountToMint)],
            });

            // WAIT FOR MINTING FINISH
            await publicClient?.waitForTransactionReceipt({
                hash: txMintHash as `0x${string}`,
                confirmations: getRequiredConfirmations(networkId),
            });

            reset();
            setResults({
                logicContractAddress: tx?.contractAddress as string,
                logicContractTxHash: txHash as string,
                proxyContractAddress: txProxy?.contractAddress as string,
                proxyContractTxHash: txProxyHash as string,
            });
            setStatus("Deployed!");
        } catch (error:any) {
       
            setError(true);
            
        
            let msg = ""
            if (error?.code === 4001) {
                msg = "Transaction rejected by user"
                setStatus(msg);
            }
            else if (error?.code === -32603) {
                msg = "Internal JSON-RPC error. Please check your balance and try again"
                setStatus(msg);
            } else {
                msg = `Deployment failed: ${error?.message || 'Unknown error'}`
                setStatus(msg);
             
            }
            // setStatus("Error, pls check your inputs and try to redeploy!");
            // setError(true);
            toast.error(error?.message.match(/.*(?=\n)/)[0]);
            console.error(`Deployment failed: ${error?.message || 'Unknown error'}`);
        } finally {
            setIsTransacting(false);
        }
    }

    const handleResultsShow = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        setShowResults(true);
    }

    return (
        <>
            {
                showResults ?
                    <Results results={results as TResults} setShowResults={setShowResults} /> :
                    <div className={styles["widget-form"]}>
                         <Toaster position="top-right" />
                        <button
                            disabled={isDisabled(status, error) || !results}
                            className={styles["widget-open-results-btn"]}
                            onClick={handleResultsShow}
                        >
                            Show Results
                        </button>
                        <form noValidate onSubmit={handleSubmit(onSubmit)}>
                            <div className={styles["widget-form-br"]}>
                                <div className={styles["widget-form-block"]}>
                                    <label htmlFor="token-name-id">Token name</label>
                                    <input className={styles["input-fw"]} type="text" id="token-name-id"
                                        {...register("Name", { required: true, minLength: 4 })}
                                        disabled={isDisabled(status, error)}
                                    ></input>
                                    {Boolean(errors.Name) && <span>Min length must be 4</span>}
                                </div>
                                <div className={styles["widget-form-block"]}>
                                    <label htmlFor="token-symbol-id">Token symbol</label>
                                    <input
                                        className={styles["input-fw"]}
                                        type="text" id="token-symbol-id"
                                        {...register("Symbol", { required: true, maxLength: 4 })}
                                        disabled={isDisabled(status, error)}
                                    ></input>
                                    {Boolean(errors.Symbol) && <span>{'Length must be => 2 and <= 4'}</span>}
                                </div>
                            </div>


                            <div className={styles["widget-form-br"]}>
                                <div className={styles["widget-form-block"]}>
                                    <div>
                                        <input
                                            type="checkbox"
                                            onInput={handleUseMaxTotalSupplyChange}
                                            id="token-supply-id-checkbox"
                                            {...register("UseMaxTotalSupply")}
                                        />
                                        <label htmlFor="token-supply-id">Max total supply</label>
                                    </div>
                                    <input
                                        className={styles["input-fw"]}
                                        type="number" id="token-supply-id"
                                        {...register("TotalSupply", { required: useMaxTotalSupply })}
                                        disabled={isDisabled(status, error) || !useMaxTotalSupply}
                                    ></input>
                                    {Boolean(errors.TotalSupply) && <span>Max total supply is required</span>}
                                </div>
                                <div className={styles["widget-form-block"]}>
                                    <label htmlFor="token-type-id">Token type</label>
                                    <select
                                        className={styles["input-fw"]}
                                        id="token-type-id"
                                        {...register("TokenType", { required: true })}
                                        disabled={isDisabled(status, error)}
                                    >
                                        <option value="default">Default</option>
                                        <option value="votable">Votable</option>
                                        <option value="accessControlDefault">Default AccessControl</option>
                                        <option value="accessControlVotable">Votable AccessControl</option>
                                    </select>
                                    {Boolean(errors.TokenType) && <span>Token type is required</span>}
                                </div>
                            </div>
                            <div className={styles["widget-form-br"]}>
                                <div className={styles["widget-form-block"]}>
                                    <label htmlFor="token-mint-id">Amount to mint</label>
                                    <input
                                        className={styles["input-fw"]}
                                        type="number"
                                        id="token-mint-id"
                                        {...register("AmountToMint", {
                                            required: "Amount to mint is required", validate: {
                                                isLessThanMaxTotalSupply: (value) => {
                                                    const { TotalSupply } = getValues();
                                                    if (!useMaxTotalSupply) {
                                                        return true;
                                                    }
                                                    return Number(value) <= Number(TotalSupply) || "Must be less than max total supply";
                                                }
                                            }
                                        })}
                                        disabled={isDisabled(status, error)}
                                    ></input>
                                    {Boolean(errors.AmountToMint) && <span>{errors.AmountToMint?.message}</span>}
                                </div>
                            </div>

                            <div className={styles["widget-form-br"]}>
                                <div className={styles["widget-form-block"]}>
                                    <label htmlFor="token-mint-address-id">Address to be minted on</label>
                                    <input
                                        className={styles["input-fw"]}
                                        type="text" id="token-mint-address-id"
                                        {...register("AddressToBeMinted", { required: true, pattern: ethereumAddressRegex })}
                                        disabled={isDisabled(status, error)}
                                    ></input>
                                    {Boolean(errors.AddressToBeMinted) && <span>Enter a valid 0x address</span>}
                                </div>
                            </div>
                            {
                                //className={!error ? styles["btn-submit"] : styles["btn-submit-error"]}
                                isConnected && address &&
                                <button
                                    className={styles["btn-submit"]}
                                    type="submit"
                                    disabled={ isTransacting }
                                >
                                    { !error ? status : "Deploy"}
                                </button>
                            }
                        </form>
                    </div>
            }
        </>
    );
}