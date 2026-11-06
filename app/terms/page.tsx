import { LegalPage } from '../legal-page'

const sections = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    content: (
      <p>By accessing or using CrossDoc, you agree to these Terms of Service and the CrossDoc Privacy Policy. If you do not agree, do not use the service.</p>
    ),
  },
  {
    id: 'description',
    title: 'Description of Service',
    content: (
      <p>CrossDoc provides temporary file sharing without user accounts. A user can upload an eligible file, receive a share link, and provide that link to an intended recipient for a download claim.</p>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    content: (
      <>
        <p>You may not use CrossDoc to upload, store, or share:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Malware, malicious code, or content intended to compromise systems or accounts.</li>
          <li>Illegal content or content that facilitates unlawful activity.</li>
          <li>Copyrighted or other protected material that you are not authorized to share.</li>
          <li>Abusive, threatening, harassing, or exploitative content.</li>
          <li>Content or links shared in violation of another person&apos;s rights or applicable law.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'user-responsibilities',
    title: 'User Responsibilities',
    content: (
      <p>You are responsible for the files you upload, your legal right to share them, and the consequences of sharing them. Keep your share links confidential and give them only to intended recipients. Anyone who obtains a valid link may attempt to claim its download.</p>
    ),
  },
  {
    id: 'one-time-download',
    title: 'One-Time Download Policy',
    content: (
      <>
        <p>A share link allows one successful claim. A second independent claim is rejected. If a download fails after the claim has been recorded, the file may not be recoverable through that link.</p>
        <p>After a successful claim, the signed download URL is valid for five minutes and may be reused during that validity period. A valid signed URL may be copied or redistributed by anyone who obtains it during that period.</p>
      </>
    ),
  },
  {
    id: 'expiry-and-deletion',
    title: 'Expiry and Deletion',
    content: (
      <p>Files expire according to their configured expiry time. Claimed files become eligible for cleanup after 10 minutes. Automated cleanup runs hourly, so deletion may be delayed. Database metadata may remain after the storage file is deleted.</p>
    ),
  },
  {
    id: 'availability',
    title: 'No Guarantee of Availability',
    content: (
      <p>CrossDoc is provided on an as-available basis. We do not guarantee that the service, uploads, links, downloads, or any particular feature will be continuously available, error-free, secure, or compatible with every device or network.</p>
    ),
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    content: (
      <p>You retain your rights in content you upload. You represent that you own or have all permissions needed to upload and share that content. You grant CrossDoc only the limited rights needed to host, process, transmit, secure, and delete the content to provide the service.</p>
    ),
  },
  {
    id: 'limitation-of-liability',
    title: 'Limitation of Liability',
    content: (
      <p>To the maximum extent permitted by applicable law, CrossDoc and its operator are not responsible for file loss, failed or incomplete downloads, unauthorized sharing of links, third-party provider outages, network failures, service interruptions, or other indirect, incidental, special, consequential, or exemplary damages arising from use of the service. Nothing in these Terms excludes liability that cannot legally be excluded.</p>
    ),
  },
  {
    id: 'suspension',
    title: 'Suspension and Termination',
    content: (
      <p>We may suspend or terminate access to CrossDoc, remove or prevent access to transfers, or take other protective action when we reasonably believe the service is being misused, these Terms are violated, security is at risk, or action is required by law.</p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to Terms',
    content: (
      <p>We may update these Terms as the service or legal requirements change. Updated Terms will be published at this URL with a revised “Last updated” date. Continued use after publication constitutes acceptance of the updated Terms, subject to applicable law.</p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Information',
    content: (
      <p>For questions about these Terms or the service, contact <a href="mailto:crossdoc.support@gmail.com" className="font-bold underline underline-offset-4">crossdoc.support@gmail.com</a>.</p>
    ),
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="CrossDoc legal"
      title="Terms of Service"
      intro="These terms set the rules for using CrossDoc, a temporary file-sharing service built for moving documents between devices."
      updated="November 7, 2026"
      sections={sections}
    />
  )
}
