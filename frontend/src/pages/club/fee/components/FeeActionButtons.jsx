import { Download, FileText } from 'lucide-react'

function FeeActionButtons({ onFeatureInProgress }) {
  return (
    <div className="club-fee-actions">
      <button
        type="button"
        onClick={() => onFeatureInProgress('영수증 일괄 다운로드')}
      >
        <Download size={16} />
        영수증 일괄 다운로드
      </button>

      <button
        type="button"
        onClick={() => onFeatureInProgress('엑셀 다운로드')}
      >
        <FileText size={16} />
        엑셀 다운로드
      </button>
    </div>
  )
}

export default FeeActionButtons