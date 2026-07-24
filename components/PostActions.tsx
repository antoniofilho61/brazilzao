'use client'

import LikeButton from './LikeButton'
import CommentButton from './CommentButton'
import ShareButton from './ShareButton'

export default function PostActions() {

  return (

    <div
      style={{
        display:'flex',
        justifyContent:'space-around',
        alignItems:'center',
        width:'100%',
        padding:'10px 0',
        borderTop:'1px solid #eee'
      }}
    >

      <LikeButton />

      <CommentButton />

      <ShareButton />

    </div>

  )

}