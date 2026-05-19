export function formatWon(value = 0){ //"xxx,xxx원" 의 형태로 반환 함수
    return `${Number(value).toLocaleString()}원`
}

export function getPaymentStatusClass(status) { //납부 상태에 따른 paid/unpaid 값 반환
    if(status === "완료") return 'paid'
    if(status === "미납") return 'unpaid'
    
    return 'pending'
}

export function getTransactionTypeClass(type){ //수입/지출에 따른 값 반환
    if(type === "수입") return 'income'
    if(type === "지출") return 'expense'

    return 'pending'
}