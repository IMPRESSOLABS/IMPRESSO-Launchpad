import type { NextPage } from 'next';
import styles from '../styles/Home.module.css';
import Widget from '../components/widget/widget';

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <Widget/>
      </main>
    </div>
  );
};

export default Home;
