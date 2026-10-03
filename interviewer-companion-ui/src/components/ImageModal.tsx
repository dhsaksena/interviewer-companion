import { MdClose } from 'react-icons/md'
import '../styles/ImageModal.css'

interface ImageModalProps {
  isOpen: boolean
  imageUrl: string
  onClose: () => void
}

const ImageModal = ({ isOpen, imageUrl, onClose }: ImageModalProps) => {
  if (!isOpen) return null

  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="image-modal-close" onClick={onClose} title="Close">
          <MdClose />
        </button>
        <img src={imageUrl} alt="Full screen view" className="image-modal-img" />
      </div>
    </div>
  )
}

export default ImageModal
