import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Article } from '../types';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Workspace Drive scope for file creation & management
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If user is logged in but access token not yet cached,
        // let the component prompt or preserve user state
        if (onAuthSuccess && cachedAccessToken) {
          onAuthSuccess(user, cachedAccessToken);
        } else {
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive access token');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export interface DriveFileInfo {
  id: string;
  name: string;
  webViewLink?: string;
  createdTime?: string;
  size?: string;
}

/**
 * Uploads an article summary or guide note to Google Drive as a Markdown document.
 * Must only be invoked after explicit user UI confirmation.
 */
export const exportArticleToGoogleDrive = async (
  article: Article,
  token: string
): Promise<DriveFileInfo> => {
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const fileName = `UpLevel AI - ${article.title.replace(/[^a-zA-Z0-9 -]/g, '')}.md`;
  const metadata = {
    name: fileName,
    mimeType: 'text/markdown',
    description: `Saved from UpLevel AI (https://uplevel.ai/article/${article.slug}). Published on ${article.publishedDate}. Author: ${article.author.name}.`,
  };

  // Build clean markdown content
  const markdownBody = `# ${article.title}
*Published by UpLevel AI | Category: ${article.category} | Read time: ${article.readTime}*
*Author: ${article.author.name} (${article.author.role})*
*Last Updated: ${article.updatedDate}*

---

## Executive Summary
${article.excerpt}

## Key Takeaways
${article.keyTakeaways.map(t => `- ${t}`).join('\n')}

---

## Overview
${article.intro}

${article.sections.map(s => {
  let sec = `\n### ${s.heading}\n${s.content}\n`;
  if (s.bullets && s.bullets.length > 0) {
    sec += '\n' + s.bullets.map(b => `- ${b}`).join('\n') + '\n';
  }
  if (s.callout) {
    sec += `\n> **[${s.callout.type.toUpperCase()}]**: ${s.callout.text}\n`;
  }
  return sec;
}).join('\n')}

---

## Frequently Asked Questions
${article.faqs.map(f => `**Q: ${f.question}**\nA: ${f.answer}\n`).join('\n')}

---
*Exported to Google Drive via UpLevel AI. Visit https://uplevel.ai for updated guides and tools.*
`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/markdown; charset=UTF-8\r\n\r\n' +
    markdownBody +
    closeDelimiter;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,createdTime,size',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Drive upload failed: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  return data as DriveFileInfo;
};

/**
 * Fetch files saved to Google Drive by UpLevel AI
 */
export const listUpLevelDriveFiles = async (token: string): Promise<DriveFileInfo[]> => {
  const query = encodeURIComponent("name contains 'UpLevel AI' and trashed = false");
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink,createdTime,size)&orderBy=createdTime desc&pageSize=20`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to list Google Drive files: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  return (data.files || []) as DriveFileInfo[];
};

/**
 * Delete a file from Google Drive (after explicit user confirmation)
 */
export const deleteFileFromDrive = async (fileId: string, token: string): Promise<void> => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to delete file from Google Drive: ${err}`);
  }
};

