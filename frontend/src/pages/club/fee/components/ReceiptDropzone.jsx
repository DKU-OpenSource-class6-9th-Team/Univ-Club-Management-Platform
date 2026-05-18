/*영수증 파일 첨부 영역 담당하는 컴포넌트
-드래그 해서 파일 선택가능
-여러 파일 첨부 가능
-선택한 파일 화면에서 확인 가능
-선택된 파일 목록은 부모 컴포넌트(FeeRegisterForm)이 사용할 수 있도록 함*/

import { FileText, X } from 'lucide-react'
import { useDropzone } from 'react-dropzone' //dropzone 라이브러리를 통해 드래그 이벤트 처리 기능 구현

const MAX_FILE_SIZE = 10 * 1024 * 1024

function ReceiptDropzone({ receiptFiles, setReceiptFiles }) { //부모 컴포넌트에서 가져온 값
  const onDrop = (acceptedFiles) => { //파일들을 드래그, 드래그 후 놓을 때
    setReceiptFiles((prev) => [...prev, ...acceptedFiles]) //기존 선택되었던 파일(prev) 뒤로 새로운 파일들 추가
  }

  const removeFile = (targetFile) => { //첨부된 파일 제거 함수
    setReceiptFiles((prev) => prev.filter((file) => file !== targetFile))
  }

  //useDropzone 설정 부분
  const {
    getRootProps, //해당 함수를 붙이면 div를 dropzone의 영역으로 만듬
    getInputProps, //박스 창을 클릭했을 때 파일 선택하는 기능 함수
    isDragActive, //파일을 드래그 박스 위에 두고 있는 지 확인할 수 있도록 하는 Bool 값
    fileRejections, // 크기 초과하거나 형식이 알맞지 않으면 거부
  } = useDropzone({
    onDrop, //파일이 정상적으로 선택되었을 경우 실행할 함수 지정(onDrop)
    multiple: true,
    maxSize: MAX_FILE_SIZE,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf'],
    },
  })

  //실제 화면에 보여줄 UI인 JSX 반환 부분
  return (
    <div className="fee-receipt-upload-section">
      <p className="upload-section-title">영수증 첨부 (선택)</p>


        {/*드래그 앤 드롭박스 영역, getRootProps코드를 통해 dropzone영역으로 만듬*/} 
      <div
        {...getRootProps()}
        className={`fee-register-upload-box ${
          isDragActive ? 'drag-active' : ''
        }`}
      >
        <input {...getInputProps()} />

        <FileText size={18} />

        <strong>
          {isDragActive
            ? '파일을 여기에 놓아주세요'
            : '파일을 드래그하거나 클릭하여 첨부하세요'}
        </strong>

        <span>JPG, PNG, PDF / 파일당 최대 10MB / 여러 개 첨부 가능</span>
      </div>

      {fileRejections.length > 0 && (
        <p className="upload-error">
          JPG, PNG, PDF 파일만 가능하며 파일당 최대 10MB까지 첨부할 수 있습니다.
        </p>
      )}

      {receiptFiles.length > 0 && (
        <ul className="receipt-file-list">
          {receiptFiles.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`}>
              <span>{file.name}</span>

              <button type="button" onClick={() => removeFile(file)}>
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ReceiptDropzone