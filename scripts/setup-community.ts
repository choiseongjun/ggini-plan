import { prepareCommunityBucket } from "../lib/community-storage";
prepareCommunityBucket().then(() => console.log("Private community photo bucket ready")).catch(error => { console.error(error instanceof Error ? error.message : "Storage setup failed"); process.exitCode = 1; });
