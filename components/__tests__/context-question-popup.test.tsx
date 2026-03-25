import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ContextQuestionPopup } from "../ai/context-question-popup"
import type { ContextQuestion } from "@/lib/types/database"

const mockAnswerContextQuestion = vi.fn()
const mockDismissContextQuestion = vi.fn()
vi.mock("@/lib/actions/context-questions", () => ({
  answerContextQuestion: (...args: unknown[]) => mockAnswerContextQuestion(...args),
  dismissContextQuestion: (...args: unknown[]) => mockDismissContextQuestion(...args),
}))

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

beforeEach(() => vi.clearAllMocks())

const makeQuestion = (overrides: Partial<ContextQuestion> = {}): ContextQuestion => ({
  id: "cq-1",
  list_id: "list-1",
  question: "How important is Dolby Vision support?",
  answer: null,
  status: "pending",
  triggered_by: "p-1",
  created_at: "2026-03-25T00:00:00Z",
  answered_at: null,
  ...overrides,
})

describe("ContextQuestionPopup", () => {
  it("renders nothing when no pending questions", () => {
    const { container } = render(<ContextQuestionPopup questions={[]} />)
    expect(container.innerHTML).toBe("")
  })

  it("renders nothing when all questions are answered", () => {
    const { container } = render(
      <ContextQuestionPopup questions={[makeQuestion({ status: "answered" })]} />
    )
    expect(container.innerHTML).toBe("")
  })

  it("renders the question text for pending questions", () => {
    render(<ContextQuestionPopup questions={[makeQuestion()]} />)
    expect(screen.getAllByText("How important is Dolby Vision support?")[0]).toBeInTheDocument()
  })

  it("renders Quick question header", () => {
    render(<ContextQuestionPopup questions={[makeQuestion()]} />)
    expect(screen.getAllByText("Quick question")[0]).toBeInTheDocument()
  })

  it("shows remaining count when multiple questions", () => {
    render(
      <ContextQuestionPopup
        questions={[
          makeQuestion({ id: "cq-1" }),
          makeQuestion({ id: "cq-2", question: "Second question?" }),
        ]}
      />
    )
    expect(screen.getAllByText("+1 more")[0]).toBeInTheDocument()
  })

  it("shows Skip button", () => {
    render(<ContextQuestionPopup questions={[makeQuestion()]} />)
    expect(screen.getAllByText("Skip")[0]).toBeInTheDocument()
  })

  it("shows Don't ask this button", () => {
    render(<ContextQuestionPopup questions={[makeQuestion()]} />)
    expect(screen.getAllByText(/Don.t ask/)[0]).toBeInTheDocument()
  })

  it("calls answerContextQuestion when answer is submitted", async () => {
    const user = userEvent.setup()
    mockAnswerContextQuestion.mockResolvedValue({ success: true, data: { id: "cq-1" } })

    render(<ContextQuestionPopup questions={[makeQuestion()]} />)

    const textarea = screen.getAllByPlaceholderText(/your answer/i)[0]
    await user.type(textarea, "Very important for my setup")

    const submitBtn = screen.getAllByRole("button").find(
      (b) => b.getAttribute("type") === "submit"
    )!
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockAnswerContextQuestion).toHaveBeenCalledWith({
        questionId: "cq-1",
        answer: "Very important for my setup",
      })
    })
  })

  it("calls dismissContextQuestion when Don't ask is clicked", async () => {
    const user = userEvent.setup()
    mockDismissContextQuestion.mockResolvedValue({ success: true, data: { id: "cq-1" } })

    render(<ContextQuestionPopup questions={[makeQuestion()]} />)

    await user.click(screen.getAllByText(/Don.t ask/)[0])

    await waitFor(() => {
      expect(mockDismissContextQuestion).toHaveBeenCalledWith({ questionId: "cq-1" })
    })
  })
})
