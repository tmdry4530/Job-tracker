import "./style.css"

function IndexPopup() {
  return (
    <div className="w-80 p-4 bg-white">
      <h1 className="text-lg font-bold text-gray-900">
        Job Application Tracker
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        채용 플랫폼 지원 현황을 자동으로 수집합니다.
      </p>
      <div className="mt-4 space-y-2">
        <div className="text-xs text-gray-400">
          로그인 상태: 대기 중
        </div>
        <div className="text-xs text-gray-400">
          마지막 동기화: -
        </div>
      </div>
      <button className="mt-4 w-full py-2 px-4 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
        대시보드 열기
      </button>
    </div>
  )
}

export default IndexPopup
