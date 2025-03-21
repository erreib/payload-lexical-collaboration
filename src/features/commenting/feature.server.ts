import { createServerFeature } from '@payloadcms/richtext-lexical'

export type CommentFeatureProps = {
  /**
   * Whether to enable the commenting feature
   * @default true
   */
  enabled?: boolean
}

export const CommentFeature = createServerFeature<
  CommentFeatureProps,
  CommentFeatureProps,
  CommentFeatureProps
>({
  feature({ props }) {
    return {
      ClientFeature: 'payload-lexical-collaboration/client#CommentClientFeature',
      clientFeatureProps: {
        enabled: props?.enabled ?? true,
      },
    }
  },
  key: 'commenting',
})
