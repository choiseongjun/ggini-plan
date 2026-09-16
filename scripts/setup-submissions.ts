import { prepareSubmissionBucket } from "../lib/submission-storage";
prepareSubmissionBucket().then(() => console.log("Private submission photo bucket ready")).catch(error => { console.error(error instanceof Error ? error.message : "Storage setup failed"); process.exitCode = 1; });
