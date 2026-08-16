"use client";
import React from "react";
import styles from "./GettingStarted.module.css";

interface GettingStartedProps {
  onNavigate: (tab: string) => void;
}

export default function GettingStarted({ onNavigate }: GettingStartedProps) {
  return (
    <div className={styles.section}>
      <h1 className={styles.title}>Getting Started with LeetBranch</h1>
      <p className={styles.subtitle}>
        Welcome to your new developer productivity platform. Follow these steps to set up your workflow.
      </p>

      <div className={styles.cardsGrid}>
        <div className={styles.card}>
          <div className={styles.stepNumber}>01</div>
          <h3 className={styles.cardTitle}>Create your account</h3>
          <p className={styles.cardDesc}>
            You've already completed this step! Your account is active and ready to go.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.stepNumber}>02</div>
          <h3 className={styles.cardTitle}>Install the extension</h3>
          <p className={styles.cardDesc}>
            The LeetBranch Chrome extension securely captures your LeetCode submissions in the background.
          </p>
          <button 
            className={styles.btnSecondary}
            onClick={() => onNavigate("INTEGRATIONS")}
          >
            Connect Extension
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.stepNumber}>03</div>
          <h3 className={styles.cardTitle}>Connect GitHub</h3>
          <p className={styles.cardDesc}>
            Link your GitHub account to automatically synchronize your solutions to a personal repository.
          </p>
          <button 
            className={styles.btnPrimary}
            onClick={() => onNavigate("INTEGRATIONS")}
          >
            Connect GitHub
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.stepNumber}>04</div>
          <h3 className={styles.cardTitle}>Solve on LeetCode</h3>
          <p className={styles.cardDesc}>
            Go to LeetCode and solve problems normally. No manual uploading is required.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.stepNumber}>05</div>
          <h3 className={styles.cardTitle}>Submit your solution</h3>
          <p className={styles.cardDesc}>
            Once your solution is accepted, LeetBranch automatically captures and syncs it.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.stepNumber}>06</div>
          <h3 className={styles.cardTitle}>Track your progress</h3>
          <p className={styles.cardDesc}>
            View your analytics, activity heatmaps, and coding streaks on your personal dashboard.
          </p>
          <button 
            className={styles.btnSecondary}
            onClick={() => onNavigate("ANALYTICS")}
          >
            View Analytics
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.stepNumber}>07</div>
          <h3 className={styles.cardTitle}>Use AI Coach</h3>
          <p className={styles.cardDesc}>
            Get instant feedback on time/space complexity, common mistakes, and hints.
          </p>
          <button 
            className={styles.btnSecondary}
            onClick={() => onNavigate("ASK_AI")}
          >
            Try AI Coach
          </button>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>How It Works</h2>
      <div className={styles.pipeline}>
        <div className={styles.pipelineStep}>
          <span className={styles.pipelineBadge}>Solve</span>
          <span className={styles.pipelineArrow}>→</span>
        </div>
        <div className={styles.pipelineStep}>
          <span className={styles.pipelineBadge}>Submit</span>
          <span className={styles.pipelineArrow}>→</span>
        </div>
        <div className={styles.pipelineStep}>
          <span className={styles.pipelineBadge}>Detect</span>
          <span className={styles.pipelineArrow}>→</span>
        </div>
        <div className={styles.pipelineStep}>
          <span className={styles.pipelineBadge}>Resolve</span>
          <span className={styles.pipelineArrow}>→</span>
        </div>
        <div className={styles.pipelineStep}>
          <span className={styles.pipelineBadge}>Sync</span>
          <span className={styles.pipelineArrow}>→</span>
        </div>
        <div className={styles.pipelineStep}>
          <span className={styles.pipelineBadge}>Analyze</span>
          <span className={styles.pipelineArrow}>→</span>
        </div>
        <div className={styles.pipelineStep}>
          <span className={styles.pipelineBadge}>Improve</span>
        </div>
      </div>
      <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "3rem" }}>
        When you submit a problem on LeetCode, the Chrome extension detects the submission. 
        LeetBranch resolves the final result, securely transmits the metadata and source code, 
        and synchronizes it with your GitHub repository. Your dashboard analytics update automatically, 
        and the AI Developer Coach is ready to provide personalized insights to help you improve.
      </p>

      <h2 className={styles.sectionTitle}>Frequently Asked Questions (FAQ)</h2>
      
      <div className={styles.faqItem}>
        <div className={styles.faqQuestion}>What is LeetBranch?</div>
        <div className={styles.faqAnswer}>
          LeetBranch is a developer productivity platform that automatically captures your LeetCode submissions, 
          synchronizes them to GitHub, and provides deep analytics along with an AI Developer Coach.
        </div>
      </div>

      <div className={styles.faqItem}>
        <div className={styles.faqQuestion}>Do I need to manually upload solutions?</div>
        <div className={styles.faqAnswer}>
          No. The LeetBranch Chrome extension automatically detects your submissions and syncs them in the background.
        </div>
      </div>

      <div className={styles.faqItem}>
        <div className={styles.faqQuestion}>How does GitHub sync work?</div>
        <div className={styles.faqAnswer}>
          Once authorized, LeetBranch uses the official GitHub App integration to commit your verified solutions 
          directly into your chosen repository. Your credentials and synchronization are securely managed server-side.
        </div>
      </div>

      <div className={styles.faqItem}>
        <div className={styles.faqQuestion}>Does "Run Code" create a submission?</div>
        <div className={styles.faqAnswer}>
          No. Only final submissions (clicking "Submit" on LeetCode) are evaluated and synchronized.
        </div>
      </div>

      <div className={styles.faqItem}>
        <div className={styles.faqQuestion}>What happens with rejected solutions?</div>
        <div className={styles.faqAnswer}>
          LeetBranch tracks rejected solutions (like Wrong Answer, Runtime Error) for your personal analytics, 
          but only Accepted solutions are typically synchronized to GitHub.
        </div>
      </div>

      <div className={styles.faqItem}>
        <div className={styles.faqQuestion}>Can I submit the same problem again?</div>
        <div className={styles.faqAnswer}>
          Yes. LeetBranch handles duplicate submissions gracefully. It will update your history and sync the latest successful code.
        </div>
      </div>

      <div className={styles.faqItem}>
        <div className={styles.faqQuestion}>How does AI Coach work?</div>
        <div className={styles.faqAnswer}>
          The Developer Coach uses a server-side AI model to analyze your submitted source code. 
          It can provide complexity analysis, point out potential mistakes, and offer optimization hints.
        </div>
      </div>

      <div className={styles.faqItem}>
        <div className={styles.faqQuestion}>What happens when I reach my AI limit?</div>
        <div className={styles.faqAnswer}>
          If you are on the Free tier and exceed your quota, you will need to wait until the limit resets or upgrade to Premium. 
          Your dashboard will display your current usage remaining.
        </div>
      </div>

      <div className={styles.faqItem}>
        <div className={styles.faqQuestion}>How does Premium payment work?</div>
        <div className={styles.faqAnswer}>
          Premium payments are processed manually. You will use your UPI app to transfer the amount, then submit 
          the reference/transaction ID on the billing page. An administrator will verify the payment and activate your Premium tier.
        </div>
      </div>

      <div className={styles.faqItem}>
        <div className={styles.faqQuestion}>What happens when Premium expires?</div>
        <div className={styles.faqAnswer}>
          Your account will gracefully return to the Free tier. The underlying AI service switches automatically, and standard limits apply. 
          You will not lose any past data or analyses.
        </div>
      </div>

      <div className={styles.faqItem}>
        <div className={styles.faqQuestion}>Is my source code public?</div>
        <div className={styles.faqAnswer}>
          Your source code is securely processed on the backend. Whether it is public on GitHub depends entirely on 
          the privacy settings of the repository you choose to sync with.
        </div>
      </div>

      <div className={styles.faqItem}>
        <div className={styles.faqQuestion}>Where are my API keys stored?</div>
        <div className={styles.faqAnswer}>
          AI provider keys and GitHub App secrets exist only on the secure backend server. 
          No sensitive credentials are ever exposed to the frontend or extension.
        </div>
      </div>

      <div className={styles.faqItem}>
        <div className={styles.faqQuestion}>Can I self-host LeetBranch?</div>
        <div className={styles.faqAnswer}>
          Yes! LeetBranch is open-source. You can run the entire stack (API, Web Dashboard, and Extension) locally. 
          Refer to the repository documentation for the setup guide.
        </div>
      </div>

    </div>
  );
}
