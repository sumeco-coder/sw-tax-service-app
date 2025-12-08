// amplify/storage/resource.ts
import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "appFiles",
  access: (allow) => ({
    // 🌎 Public folder: anyone can read, signed-in users can upload
    "public/*": [
      allow.guest.to(["read"]),
      allow.authenticated.to(["read", "write"]),
    ],

    // 🔒 Private folder: each signed-in user can read/write/delete their own files
    "private/{entity_id}/*": [
      allow.entity("identity").to(["read", "write", "delete"]),
    ],
  }),
});
