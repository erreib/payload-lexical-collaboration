# Payload Lexical Collaboration Plugin

A Payload CMS plugin that adds collaborative commenting functionality to the Lexical rich text editor.

## Features

- Add inline comments to text content
- Create comment threads for discussion
- Mark comments as resolved
- User attribution for comments
- Real-time updates (when used with Payload's built-in REST API)

## Installation

```bash
npm install payload-lexical-collaboration
# or
yarn add payload-lexical-collaboration
# or
pnpm add payload-lexical-collaboration
```

## Usage

### Add to your Payload config

```typescript
import { buildConfig } from 'payload/config';
import { payloadLexicalCollaboration } from 'payload-lexical-collaboration';

export default buildConfig({
  // ... other config
  plugins: [
    payloadLexicalCollaboration({
      // Optional configuration options
      // disabled: false,
    }),
  ],
});
```

### Add to your Lexical field configuration

```typescript
import { CommentFeature } from 'payload-lexical-collaboration';

const Page = {
  slug: 'pages',
  fields: [
    {
      name: 'content',
      type: 'richText',
      features: [
        // ... other features
        CommentFeature({
          // Optional configuration options
          // enabled: true,
        }),
      ],
    },
  ],
};
```

## How It Works

The plugin adds a commenting feature to the Lexical editor in Payload CMS. It creates a new collection called `lexical-collaboration-plugin-comments` to store comments and their associated metadata.

Comments can be added to specific text selections within the editor. Users can create comment threads, reply to existing comments, and mark comments as resolved.

## Requirements

- Payload CMS v3.17.1 or higher
- @payloadcms/richtext-lexical v3.17.1 or higher

## License

MIT
