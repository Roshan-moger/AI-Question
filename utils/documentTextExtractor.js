import pdf from "pdf-parse";
import mammoth from "mammoth";

/**
 * Extract text from PDF or DOCX
 * @param {Object} file - multer file object
 * @returns {Promise<string>}
 */
export async function extractDocumentText(file) {
    if (!file || !file.buffer) {
        throw new Error("Invalid file");
    }

    let extractedText = "";

    // -------------------------------
    // PDF
    // -------------------------------
    if (file.mimetype === "application/pdf") {
        const data = await pdf(file.buffer);
        extractedText = data.text;
    }

    // -------------------------------
    // DOCX
    // -------------------------------
    else if (
        file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
        const result = await mammoth.extractRawText({
            buffer: file.buffer,
        });
        extractedText = result.value;
    } else {
        throw new Error("Unsupported file type");
    }

    // -------------------------------
    // Clean + limit size
    // -------------------------------
    extractedText = extractedText
        .replace(/\s+/g, " ")
        .trim();

    // IMPORTANT: prevent token overflow
    return extractedText.slice(0, 12000);
}