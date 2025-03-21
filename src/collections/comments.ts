import type { CollectionConfig } from 'payload'

export const Comments: CollectionConfig = {
  slug: 'comments',
  admin: {
    useAsTitle: 'content',
    defaultColumns: ['content', 'author', 'createdAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'documentId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'threadId',
      type: 'text',
      required: true,
    },
    {
      name: 'content',
      type: 'text',
      required: true,
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'quote',
      type: 'text',
    },
    {
      name: 'range',
      type: 'json',
    },
    {
      name: 'resolved',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'parentComment',
      type: 'relationship',
      relationTo: 'comments',
    }
  ]
}
