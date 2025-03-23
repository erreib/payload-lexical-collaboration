# Payload Lexical Collaboration Plugin

A Payload CMS plugin that adds collaborative commenting functionality to the Lexical rich text editor, enabling content teams to discuss and collaborate on content directly within the editor.

## Features

- **Inline Comments**: Add comments to specific text selections within the editor
- **Comment Threads**: Create and manage threaded discussions on content
- **Comment Resolution**: Mark comments as resolved to track progress
- **User Attribution**: Comments are linked to Payload users for accountability
- **Real-time Updates**: Comments update in real-time when using Payload's REST API
- **Visual Highlighting**: Commented text is visually highlighted in the editor
- **Comment Panel**: Dedicated panel for viewing and managing all comments
- **Seamless Integration**: Works with Payload's existing user system and permissions

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
      // collections: { users: true } // Specify collections to add custom fields to
    }),
  ],
});
```

### Add the CommentFeature to Lexical

You can add the CommentFeature in two ways:

#### Option 1: Globally for all richText fields

```typescript
import { buildConfig } from 'payload/config';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { CommentFeature } from 'payload-lexical-collaboration';

export default buildConfig({
  // ... other config
  editor: lexicalEditor({
    features: [
      // ... other global features
      CommentFeature({
        // Optional configuration options
        // enabled: true,
      }),
    ],
  }),
  // ... rest of config
});
```

#### Option 2: Per field configuration

```typescript
import { CommentFeature } from 'payload-lexical-collaboration';

const Page = {
  slug: 'posts',
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

The plugin consists of several key components:

1. **Payload Plugin**: Creates a new collection called `lexical-collaboration-plugin-comments` to store comments and their associated metadata.

2. **Lexical Feature**: Adds UI components and functionality to the Lexical editor for creating, viewing, and managing comments.

3. **Comment Store**: Manages the state of comments and provides methods for adding, deleting, and updating comments.

4. **Mark Nodes**: Uses Lexical's mark nodes to highlight commented text in the editor.

5. **API Integration**: Communicates with Payload's REST API to persist comments and sync them across users.

### Comment Structure

Comments are stored with the following structure:

- **documentId**: The ID of the document being commented on
- **threadId**: The ID of the thread the comment belongs to
- **content**: The text content of the comment
- **author**: Relationship to the Payload user who created the comment
- **quote**: The text that was selected when creating the comment
- **range**: JSON data representing the selection range
- **resolved**: Boolean indicating if the comment has been resolved
- **parentComment**: Optional relationship to a parent comment (for threaded replies)

## Configuration Options

### Plugin Options

The `payloadLexicalCollaboration` function accepts the following options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `disabled` | `boolean` | `false` | Disable the plugin entirely |
| `collections` | `Partial<Record<CollectionSlug, true>>` | `{}` | Specify collections to add custom fields to |

### Feature Options

The `CommentFeature` function accepts the following options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable or disable the commenting feature for a specific field |

## Requirements

- Payload CMS v3.17.1 or higher
- @payloadcms/richtext-lexical v3.17.1 or higher
- Node.js ^18.20.2 || >=20.9.0

## Development

### Project Structure

```
src/
├── index.ts                  # Main plugin entry point
├── exports/                  # Export files for client and RSC
└── features/
    └── commenting/           # Commenting feature implementation
        ├── api/              # API services
        ├── components/       # React components
        ├── hooks/            # React hooks
        ├── services/         # Service classes
        ├── types/            # TypeScript types
        ├── utils/            # Utility functions
        ├── command.ts        # Lexical commands
        ├── feature.client.tsx # Client-side feature implementation
        ├── feature.server.ts # Server-side feature implementation
        └── store.ts          # Comment state management
```

### Building

```bash
# Install dependencies
pnpm install

# Build the plugin
pnpm build

# Run development server
pnpm dev
```

## License

MIT
