import { Link } from "react-router-dom";
import styles from "./QuizChoiceMenu.module.css";

const QuizChoiceMenu = () => {
  return (
    <div className={styles.menu}>
      <Link to="/quiz/beginner" className={styles.boxLink}>
        <div className={`${styles.box} ${styles.beginnerQuiz}`}>
          <h3>Beginner Quiz (DOES NOT WORK YET)</h3>
          <p>Learn the fundamentals like shots and syrup pumps per size.</p>
        </div>
      </Link>
      <Link to="/quiz/advanced" className={styles.boxLink}>
        <div className={`${styles.box} ${styles.drinkBuildQuiz}`}>
          <h3>Drink Build Quiz</h3>
          <p>Test your knowledge on the step-by-step process for each drink.</p>
        </div>
      </Link>
    </div>
  );
};

export default QuizChoiceMenu;
