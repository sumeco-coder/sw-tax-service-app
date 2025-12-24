import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from "./storage/resource";
import { assignRoleOnConfirm } from "./functions/assignRoleOnConfirm/resource";  // <-- REQUIRED IMPORT
import { socialPostRunner } from "./functions/socialPostRunner/resource";
import { emailCampaignRunner } from "./functions/emailCampaignRunner/resource";
import { emailCampaignRunnerV2 } from "./functions/emailCampaignRunnerV2/resource";
/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
defineBackend({
  auth,
  data,
  storage,
  assignRoleOnConfirm,
  socialPostRunner,
  emailCampaignRunner,
  emailCampaignRunnerV2,
});

