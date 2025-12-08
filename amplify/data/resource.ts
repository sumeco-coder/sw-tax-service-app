import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any unauthenticated user can "create", "read", "update", 
and "delete" any "Todo" records.
=========================================================================*/
const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
      owner: a
        .string()
        .authorization((allow) => [allow.owner()])
        .required(),
    })
    .authorization((allow) => [allow.owner()]),

  Waitlist: a
    .model({
      name: a.string().required(),
      email: a.email().required(),
      phone: a.string(),
      contactMethod: a.enum(["email", "sms", "phone"]),
      taxYear: a.integer(),
      message: a.string(),
      source: a.string(),
      owner: a.string().authorization((allow) => [allow.owner()]),
      createdAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.guest().to(["create"]), // <- this triggers guest support
      allow.owner(),
      allow.group("admin").to(["read", "update", "delete"]),
    ]),

  // --- LMS models -----------------------------------------------------

  Firm: a
    .model({
      name: a.string().required(),
      // Cognito sub of firm owner
      ownerSub: a.string().required(),
      // optional slug like "sw-tax-service"
      slug: a.string(),
      createdAt: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),

  Course: a
    .model({
      firmId: a.string().required(), // references Firm.id
      title: a.string().required(),
      description: a.string(),
      level: a.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
      status: a.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
      estimatedMinutes: a.integer(),
      slug: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),

  Module: a
    .model({
      courseId: a.string().required(), // references Course.id
      title: a.string().required(),
      description: a.string(),
      sortOrder: a.integer().default(1),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),

  Lesson: a
    .model({
      moduleId: a.string().required(), // references Module.id
      title: a.string().required(),
      content: a.string(),
      videoUrl: a.string(),
      sortOrder: a.integer().default(1),
      isRequired: a.boolean().default(true),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),

  Enrollment: a
    .model({
      courseId: a.string().required(),
      userSub: a.string().required(), // Cognito sub of preparer
      progressPercent: a.integer().default(0),
      lastVisitedLessonId: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),

  LessonProgress: a
    .model({
      lessonId: a.string().required(),
      userSub: a.string().required(),
      completed: a.boolean().default(false),
      completedAt: a.datetime(),
      createdAt: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),

  SopFile: a
    .model({
      firmId: a.string().required(),
      title: a.string().required(),
      s3Key: a.string().required(), // key in Amplify Storage
      uploadedBySub: a.string().required(),
      createdAt: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
