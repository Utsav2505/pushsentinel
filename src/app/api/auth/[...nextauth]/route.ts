/* eslint-disable */
import NextAuth from "next-auth";
import { JWT } from "next-auth/jwt";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { Session, User as NextAuthUser } from "next-auth";

// Extend the JWT type to include accessToken
declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    email?: string;
    name?: string;
  }
}

// Extend the Session type to include accessToken
declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    accessToken?: string;
  }

  interface Profile {
    picture?: string;
  }
}

const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      // Add scope for accessing all repositories (public and private)
      authorization: {
        params: {
          scope: 'repo user:email',
        },
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/error",
    newUser: "/feed",
  },
  callbacks: {
    async signIn({ user, account, profile }: { user: NextAuthUser; account: any; profile?: any }) {
      try {
        if (account?.provider === "github") {
          console.log("GitHub sign-in successful");
          return true;
        }
        return true; // Allow sign-in for other providers (Google)
      } catch (err) {
        console.error("Error in signIn callback:", err);
        return false;
      }
    },
    async jwt({ token, user, account }: { token: JWT; user?: NextAuthUser; account?: any }) {
      // When user signs in, add details to token
      if (account && user) {
        if (account.provider === "github") {
          // Store the GitHub access token
          token.accessToken = account.access_token;
        }
        if (user.email) {
          token.email = user.email;
          token.name = user.name ?? undefined;
        }
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // Add token details to session
      if (session.user) {
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.accessToken = token.accessToken; // Add accessToken to session
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const GoogleAuthHandler = NextAuth(authOptions);

export { GoogleAuthHandler as GET, GoogleAuthHandler as POST };