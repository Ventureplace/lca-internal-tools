/*
 * Figma file constants — IDs, metadata, section deep-links.
 *
 * V1 section URLs preserved verbatim from the previous index.html (file ID
 * unchanged; the SHARED file was just renamed). V2 is the LCA internal working
 * file for the V2.0 build — sections to be added as designs land.
 *
 * `embedUrl(canonicalUrl)` wraps any Figma URL in the embed pattern Figma documents:
 *   https://www.figma.com/embed?embed_host=share&url=<encoded>
 */

export function embedUrl(canonicalUrl) {
  return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(canonicalUrl)}`;
}

const V1_FILE = 'cKsRu32uAlYS3tklgxnlyr';
const V2_FILE = '1am3gguvU9eF7TDgk4ipJh';

export const VERSIONS = [
  {
    id: 'v2',
    label: 'V2',
    title: 'Project Remedy — V2',
    tag: 'Active',
    tagClass: 'mint',
    audience: 'GA — Ontario launch',
    date: 'May 1, 2026',
    desc: 'LCA internal working file for the V2.0 build. Active design surface.',
    fileId: V2_FILE,
    fileUrl: `https://www.figma.com/design/${V2_FILE}/-Internal--Project-Remedy-V2.0?node-id=2001-16`,
    coverFrame: `https://www.figma.com/design/${V2_FILE}/-Internal--Project-Remedy-V2.0?node-id=2001-16`,
    sections: [
      { name: 'Cover', url: `https://www.figma.com/design/${V2_FILE}/-Internal--Project-Remedy-V2.0?node-id=2001-16` },
    ],
  },
  {
    id: 'v1',
    label: 'V1',
    title: 'Project Remedy — V1',
    tag: 'Pilot',
    tagClass: 'sky',
    audience: '100-user internal pilot',
    date: 'Apr 1, 2026',
    desc: 'Loblaw Digital shared design file for the V1 pilot release.',
    fileId: V1_FILE,
    fileUrl: `https://www.figma.com/design/${V1_FILE}/-SHARED--Project-Remedy-V1.0?node-id=6005-225093`,
    coverFrame: `https://www.figma.com/design/${V1_FILE}/-SHARED--Project-Remedy-V1.0?node-id=6005-225093`,
    sections: [
      { name: 'Cover',                  url: `https://www.figma.com/design/${V1_FILE}/-SHARED--Project-Remedy-V1.0?node-id=6005-225093` },
      { name: 'Entry Point',            url: `https://www.figma.com/design/${V1_FILE}/-SHARED--Project-Remedy-V1.0?node-id=2807-45852` },
      { name: 'Chat UI',                url: `https://www.figma.com/design/${V1_FILE}/-SHARED--Project-Remedy-V1.0?node-id=2807-45851` },
      { name: 'Chat Components',        url: `https://www.figma.com/design/${V1_FILE}/-SHARED--Project-Remedy-V1.0?node-id=3037-4232` },
      { name: 'Consent & Permissions',  url: `https://www.figma.com/design/${V1_FILE}/-SHARED--Project-Remedy-V1.0?node-id=2807-45855` },
      { name: 'Conversation History',   url: `https://www.figma.com/design/${V1_FILE}/-SHARED--Project-Remedy-V1.0?node-id=2807-45853` },
      { name: 'Nav & Care Routing',     url: `https://www.figma.com/design/${V1_FILE}/-SHARED--Project-Remedy-V1.0?node-id=2807-45857` },
      { name: 'Red Flag Escalation',    url: `https://www.figma.com/design/${V1_FILE}/-SHARED--Project-Remedy-V1.0?node-id=2807-45859` },
    ],
  },
];

export function getVersion(id) {
  return VERSIONS.find(v => v.id === id) || VERSIONS[0];
}
