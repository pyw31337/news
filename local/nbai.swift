// NewsBoard: Apple 온디바이스 모델 호출기 (macOS 26+, Apple Intelligence 켜진 Apple Silicon Mac)
// 빌드: swiftc -O nbai.swift -o bin/nbai     사용법: nbai "지시문" [최대토큰] < 프롬프트
import Foundation
import FoundationModels
let args = CommandLine.arguments
let instr = args.count > 1 ? args[1] : ""
let maxTok = args.count > 2 ? Int(args[2]) ?? 600 : 600
let prompt = String(data: FileHandle.standardInput.readDataToEndOfFile(), encoding: .utf8) ?? ""
guard case .available = SystemLanguageModel.default.availability else { FileHandle.standardError.write("ERR unavailable\n".data(using: .utf8)!); exit(2) }
let sem = DispatchSemaphore(value: 0); var code: Int32 = 0
Task {
  do {
    let s = LanguageModelSession(instructions: instr)
    let r = try await s.respond(to: prompt, options: GenerationOptions(temperature: 0.2, maximumResponseTokens: maxTok))
    print(r.content)
  } catch { FileHandle.standardError.write("ERR \(error)\n".data(using: .utf8)!); code = 1 }
  sem.signal()
}
sem.wait(); exit(code)
