
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const config = {
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        apiKey: { label: "API Key", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.apiKey) return null;
        const apiKey = credentials.apiKey as string;

        // Validate against backend
        // We can do a lightweight call to check if the key is valid, e.g., get sessions
        // Or simply trust it for now and let the backend reject requests if invalid.
        // However, for Auth.js, we need to return a user object if successful.

        try {
           const res = await fetch("http://localhost:3000/api/v1/sessions", {
             headers: { "x-api-key": apiKey },
           });

           if (res.ok) {
             return { id: "admin", apiKey: apiKey, name: "Admin" };
           }
           return null;
        } catch (e) {
            console.error("Auth check failed", e);
            return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.apiKey = user.apiKey;
      }
      return token;
    },
    session({ session, token }: { session: any; token: any }) {
      session.apiKey = token.apiKey;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);
