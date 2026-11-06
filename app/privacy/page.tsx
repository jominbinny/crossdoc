import { LegalPage } from '../legal-page'

const sections = [
  {
    id: 'introduction',
    title: 'Introduction',
    content: (
      <>
        <p>CrossDoc is a temporary file-sharing service that helps you move documents between devices without requiring an account. This Privacy Policy explains what information we process when you use CrossDoc, why we process it, and the choices and responsibilities that apply.</p>
        <p>CrossDoc is operated by an operator whose identity and other contact details are still being finalized. Please see the Contact section for the current support and privacy contact.</p>
      </>
    ),
  },
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    content: (
      <>
        <p>When you upload a file, CrossDoc may process the uploaded filename, file type, size, other file metadata, file contents, upload and download timestamps, expiry and claim status.</p>
        <p>Our infrastructure providers may also process technical information needed to operate and protect the service, such as request information, device and browser details, and diagnostic logs. IP addresses may be processed for rate limiting, abuse prevention, and security.</p>
      </>
    ),
  },
  {
    id: 'how-we-use-information',
    title: 'How We Use Information',
    content: (
      <p>We use information to provide file transfers, generate and validate share links, process one-time download claims, prevent abuse and unauthorized use, enforce rate limits, troubleshoot service issues, and automatically clean up expired or claimed files and related data.</p>
    ),
  },
  {
    id: 'file-storage-and-security',
    title: 'File Storage and Security',
    content: (
      <>
        <p>Uploaded files are stored in a private Supabase Storage bucket. Share tokens are hashed in the database. When a download is claimed, CrossDoc provides a time-limited signed URL to retrieve the private file.</p>
        <p>These measures are designed to reduce unnecessary exposure, but no online service can guarantee absolute security. CrossDoc does not claim to provide end-to-end encryption.</p>
      </>
    ),
  },
  {
    id: 'retention-and-deletion',
    title: 'File Retention and Deletion',
    content: (
      <>
        <p>Files expire according to their configured expiry time. Once a file has been successfully claimed, it becomes eligible for cleanup after 10 minutes. Automated cleanup runs hourly, so actual deletion may be delayed after a file becomes eligible.</p>
        <p>Database metadata, such as transfer status, timestamps, and token hashes, may remain after the storage file is deleted when needed for security, auditing, or operational purposes.</p>
      </>
    ),
  },
  {
    id: 'sharing-and-disclosure',
    title: 'Sharing and Disclosure',
    content: (
      <p>Anyone possessing a valid share link may attempt to claim its download. CrossDoc does not make uploaded files publicly browsable. We disclose information to infrastructure providers and other parties only as needed to operate, secure, maintain, or comply with legal obligations applicable to the service.</p>
    ),
  },
  {
    id: 'third-party-services',
    title: 'Third-Party Services',
    content: (
      <p>CrossDoc uses Supabase for its database, private storage, and Edge Functions, and Vercel for hosting. These providers may process information on our behalf and their own privacy policies and terms also apply to their services.</p>
    ),
  },
  {
    id: 'responsibilities-and-rights',
    title: 'Your Responsibilities and Rights',
    content: (
      <p>You are responsible for using CrossDoc lawfully and for protecting any share links you create. If you have a privacy question, believe information has been handled improperly, or want to raise a data concern, contact the operator at <a href="mailto:crossdoc.support@gmail.com" className="font-bold underline underline-offset-4">crossdoc.support@gmail.com</a>. Requests are handled subject to applicable law and reasonable verification requirements.</p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    content: (
      <p>We may update this Privacy Policy as CrossDoc changes or as legal requirements develop. Updated versions will be published at this URL with a revised “Last updated” date. Your continued use of the service after an update means the revised policy applies to future use, subject to applicable law.</p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    content: (
      <p>For privacy questions and data concerns, contact <a href="mailto:crossdoc.support@gmail.com" className="font-bold underline underline-offset-4">crossdoc.support@gmail.com</a>.</p>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="CrossDoc legal"
      title="Privacy Policy"
      intro="This policy describes how CrossDoc handles information when you upload, share, or download a temporary document."
      updated="November 7, 2026"
      sections={sections}
    />
  )
}
