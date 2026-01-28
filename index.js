import express from "express";
import cors from "cors";
import { OpenRouter } from "@openrouter/sdk";

const app = express();
app.use(express.json());
app.use(cors());

// -------------------------------
// Initialize OpenRouter client
// -------------------------------
const openRouter = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
});

// -------------------------------
// Model Map
// -------------------------------
const modelMap = {
    gpt35: "openai/gpt-3.5-turbo",
    mistralFree: "mistralai/devstral-2512:free",
    xiomiFree: "xiaomi/mimo-v2-flash:free",
    deepSeekFree: "tngtech/deepseek-r1t2-chimera:free",
    metaLiammaFree: "meta-llama/llama-3.3-70b-instruct:free",
    acreeFree: "arcee-ai/trinity-mini:free",
    zAiFree: "z-ai/glm-4.5-air:free",
};

// -------------------------------
// Helper: Clean option text
// -------------------------------
function cleanOption(text) {
    if (!text) return "";
    return text
        .replace(/^[A-D][).]\s*/i, "")
        .replace(/^Option\d+:\s*/i, "")
        .trim();
}

function getDifficultyId(level) {
    if (level === "Easy") return 1;
    if (level === "Medium") return 2;
    if (level === "Hard") return 3;
    return 1;
}

// -------------------------------
// API: Generate Questions
// -------------------------------
app.post("/api/questions", async(req, res) => {
    try {
        const {
            topic,
            productguid,
            organizationguid,
            repositoryguid,
            type,
            count,
            model,
            difficulty,
        } = req.body;

        const modelToUse = model || modelMap.gpt35;

        // -------------------------------
        // Defaults
        // -------------------------------
        const finalProductGuid =
            productguid
        const finalOrgGuid =
            organizationguid
        const finalRepoGuid =
            repositoryguid

        const finalCount = count
        const finalType = type
        const finalDifficulty = difficulty

        // -------------------------------
        // PROMPT WITH DIFFICULTY
        // -------------------------------
        let prompt = "";

        if (finalType === "TF") {
            prompt = `
Generate exactly ${finalCount} ${finalDifficulty} difficulty true/false questions on "${topic}".

STRICT RULES:
- Only use True and False
- No explanations
- No numbering
- No extra text

FORMAT ONLY:
Question | True | False | CorrectOptionNumber

CorrectOptionNumber must be 1 or 2
`;
        } else if (finalType === "MRQ") {
            prompt = `
Generate exactly ${finalCount} ${finalDifficulty} difficulty multiple-response questions on "${topic}".

VERY IMPORTANT RULES:
- Do NOT use A), B), C), D)
- Do NOT write Answer or explanation
- Do NOT number questions
- Do NOT repeat questions
- Output plain text only

STRICT FORMAT:
Question | Option1 | Option2 | Option3 | Option4 | CorrectOptionNumbers

CorrectOptionNumbers MUST be comma-separated values (e.g., 1,3 or 2,4)

Example:
Which of the following are programming languages? | Python | HTML | Java | CSS | 1,3
`;
        } else if (finalType === "FIBDnD") {
            prompt = `
Generate exactly ${finalCount} ${finalDifficulty} Fill In The Blanks Drag and Drop questions on "${topic}".

STRICT RULES:
- Use exactly one blank
- Represent blank as @^^{Blank 1}^^@
- Do NOT number questions
- Do NOT add explanations
- Output plain text only

FORMAT:
Question | Option1 | Option2 | Option3 | Option4 | CorrectOptionNumber

Example:
Water freezes at @^^{Blank 1}^^@ degrees | 0 | 10 | 50 | 100 | 1
`;
        } else if (finalType === "FIBDD") {
            prompt = `
Generate exactly ${finalCount} ${finalDifficulty} Fill In The Blanks Dropdown questions on "${topic}".

STRICT RULES:
- Use exactly one blank
- Represent blank as @^^{Blank 1}^^@
- Do NOT number questions
- Do NOT add explanations
- Output plain text only

FORMAT:
Question | Option1 | Option2 | Option3 | Option4 | CorrectOptionNumber

Example:
@^^{Blank 1}^^@ is the capital of France | London | Berlin | Madrid | Paris | 4
`;
        } else if (finalType === "MTF" || finalType === "MatchingSequence" || finalType === "MatchingConnectThePoints") {
            prompt = `
Generate exactly ${finalCount} ${finalDifficulty} difficulty Match The Following questions on "${topic}".

STRICT RULES:
- Do NOT number questions
- Do NOT add explanations
- Output plain text only

FORMAT:
Question |
Left1, Left2, Left3, Left4 |
Right1, Right2, Right3, Right4 |
CorrectPairs

CorrectPairs format:
1-1,2-2,3-3,4-4

Example:
Match the countries with their capitals |
India, France, Japan, Germany |
New Delhi, Paris, Tokyo, Berlin |
1-1,2-2,3-3,4-4
`;
        } else if (finalType === "Sequencing") {
            prompt = `
Generate exactly ${finalCount} ${finalDifficulty} difficulty Sequencing questions on "${topic}".

STRICT RULES:
- Do NOT number questions
- Do NOT add explanations
- Output plain text only

FORMAT:
Question |
Option1 | Option2 | Option3 | Option4 |
CorrectOrder

CorrectOrder format:
1,2,3,4

Example:
Arrange the steps of software development |
Design | Coding | Testing | Deployment |
1,2,3,4
`;
        } else if (finalType === "FIBT") {
            prompt = `
Generate exactly ${finalCount} ${finalDifficulty} difficulty Fill in the blank (Text input) questions on "${topic}".

STRICT RULES:
- Use exactly one blank
- Use @^^{Blank 1}^^@
- Answer must be text or number only
- No explanations
- No numbering

FORMAT:
Question | Answer

Example:
5 × 6 = @^^{Blank 1}^^@ | 30
`;
        } else {
            prompt = `
Generate exactly ${finalCount} ${finalDifficulty} difficulty multiple-choice questions on "${topic}".

VERY IMPORTANT RULES:
- Do NOT use A), B), C), D)
- Do NOT write Answer or explanation
- Do NOT number questions
- Do NOT repeat questions
- Output plain text only

STRICT FORMAT:
Question | Option1 | Option2 | Option3 | Option4 | CorrectOptionNumber

CorrectOptionNumber MUST be 1, 2, 3, or 4

Example:
Which organelle produces ATP? | Nucleus | Mitochondria | Golgi apparatus | Ribosome | 2
`;
        }


        // -------------------------------
        // Call OpenRouter
        // -------------------------------
        const completion = await openRouter.chat.send({
            model: modelToUse,
            messages: [{ role: "user", content: prompt }],
            stream: false,
        });

        const text = completion.choices[0].message.content;

        console.log("\nRAW AI OUTPUT:\n", text);

        // -------------------------------
        // Parse Output
        // -------------------------------
        const lines = text
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.includes("|"));

        const questions = lines.map((line, index) => {
            const parts = line.split("|").map((p) => p.trim());

            let questionText, correct;
            let choices = [];
            let leftItems = [];
            let rightItems = [];
            let sequence = [];
            if (finalType === "TF") {
                const [q, opt1, opt2, corr] = parts;
                questionText = q;
                correct = [Number(corr)];
                choices = [{
                        choiceid: 1,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 1,
                        choicetext: opt1,
                    },
                    {
                        choiceid: 2,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 2,
                        choicetext: opt2,
                    },
                ];
            } else if (finalType === "MCQ") {
                const [q, o1, o2, o3, o4, corr] = parts;

                questionText = q;
                correct = [Number(corr)];

                choices = [{
                        choiceid: 1,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 1,
                        choicetext: cleanOption(o1),
                    },
                    {
                        choiceid: 2,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 2,
                        choicetext: cleanOption(o2),
                    },
                    {
                        choiceid: 3,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 3,
                        choicetext: cleanOption(o3),
                    },
                    {
                        choiceid: 4,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 4,
                        choicetext: cleanOption(o4),
                    },
                ];
            } else if (finalType === "MRQ") {
                const [q, o1, o2, o3, o4, corr] = parts;
                questionText = q;
                correct = corr.split(",").map((n) => Number(n.trim())); // multiple answers
                choices = [{
                        choiceid: 1,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 1,
                        choicetext: cleanOption(o1),
                    },
                    {
                        choiceid: 2,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 2,
                        choicetext: cleanOption(o2),
                    },
                    {
                        choiceid: 3,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 3,
                        choicetext: cleanOption(o3),
                    },
                    {
                        choiceid: 4,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 4,
                        choicetext: cleanOption(o4),
                    },
                ];
            } else if (finalType === "FIBDnD") {
                const [q, o1, o2, o3, o4, corr] = parts;

                questionText = q;
                correct = [Number(corr)];

                choices = [{
                        choiceid: 1,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 1,
                        choicetext: cleanOption(o1),
                    },
                    {
                        choiceid: 2,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 2,
                        choicetext: cleanOption(o2),
                    },
                    {
                        choiceid: 3,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 3,
                        choicetext: cleanOption(o3),
                    },
                    {
                        choiceid: 4,
                        choiceguid: "00000000-0000-0000-0000-000000000000",
                        choiceorder: 4,
                        choicetext: cleanOption(o4),
                    },
                ];
            } else if (finalType === "FIBDD") {
                const [q, o1, o2, o3, o4, corr] = parts;

                questionText = q;
                correct = [Number(corr)];

                choices = [{
                        optionid: 1,
                        optionguid: "00000000-0000-0000-0000-000000000000",
                        optiontext: cleanOption(o1),
                    },
                    {
                        optionid: 2,
                        optionguid: "00000000-0000-0000-0000-000000000000",
                        optiontext: cleanOption(o2),
                    },
                    {
                        optionid: 3,
                        optionguid: "00000000-0000-0000-0000-000000000000",
                        optiontext: cleanOption(o3),
                    },
                    {
                        optionid: 4,
                        optionguid: "00000000-0000-0000-0000-000000000000",
                        optiontext: cleanOption(o4),
                    },
                ];
            } else if (finalType === "FIBT") {
                // -------------------------------
                // TEXT INPUT BLANK
                // -------------------------------
                const [q, answer] = parts;

                questionText = q;
                correct = [answer];

            }


            /* ============================
               ✅ MTF
               ============================ */
            else if (finalType === "MTF" || finalType === "MatchingSequence" || finalType === "MatchingConnectThePoints") {

                const cleaned = text
                    .replace(/\n/g, " ")
                    .replace(/\s*\|\s*/g, "|")
                    .trim();

                const parts = cleaned.split("|");



                const [q, left, right, corr] = parts;

                questionText = q.trim();

                leftItems = left.split(",").map((t, i) => ({
                    blankid: i + 1,
                    blanktext: t.trim(),
                }));

                rightItems = right.split(",").map((t, i) => ({
                    optionid: i + 1,
                    optiontext: t.trim(),
                }));

                correct = corr.split(",").map(pair => {
                    const [l, r] = pair.split("-");
                    return {
                        blankid: Number(l),
                        optionid: Number(r),
                    };
                });
            }



            /* ============================
               ✅ SEQUENCING
               ============================ */
            else if (finalType === "Sequencing") {

                const cleaned = text
                    .replace(/\n/g, " ")
                    .replace(/\s*\|\s*/g, "|")
                    .trim();

                const parts = cleaned.split("|");

                // Example:
                // 0 → Question |
                // 1 → Option1 | Option2 | Option3 | Option4 |
                // 2 → 2,1,3,4

                const [q, items, order] = parts;

                questionText = q;
                choices = items.split(",").map((t, i) => ({
                    optionid: i + 1,
                    optiontext: t.trim(),
                }));

                sequence = order.split(",").map(n => Number(n.trim()));
            }


            /* =====================================================
               ✅ RETURN STRUCTURES
               ===================================================== */

            if (finalType === "MTF" || finalType === "MatchingConnectThePoints" || finalType === "MatchingSequence") {
                return {
                    productguid: finalProductGuid,
                    organizationguid: finalOrgGuid,
                    assetguids: [],
                    question: {
                        questionguid: "00000000-0000-0000-0000-000000000000",
                        repositoryguid: finalRepoGuid,
                        questioncode: `${finalType}-${index + 1}`,
                        questiontext: `<p>${questionText}</p>`,
                        questiontype: finalType,
                        questionlevelid: getDifficultyId(finalDifficulty),
                        language: "English",

                        data: {
                            blanks: leftItems,
                            options: rightItems,
                            preferences: {
                                shuffle: true,
                                ishorizontalalignment: true,
                            },
                        },

                        answers: correct.map(c => ({
                            blankid: c.blankid,
                            options: [{
                                optionid: c.optionid,
                                score: 2,
                                iscorrect: true,
                            }],
                        })),

                        hints: { hint1: "", hint2: "", hint3: "" },
                        passageid: null,
                    },
                };
            } else if (finalType === "Sequencing") {
                return {
                    productguid: finalProductGuid,
                    organizationguid: finalOrgGuid,
                    assetguids: [],
                    question: {
                        questionguid: "00000000-0000-0000-0000-000000000000",
                        repositoryguid: finalRepoGuid,
                        questioncode: `${finalType}-${index + 1}`,
                        questiontext: `<p>${questionText}</p>`,
                        questiontype: finalType,
                        questionlevelid: getDifficultyId(finalDifficulty),
                        language: "English",

                        data: {
                            options: choices,
                            preferences: {
                                shuffle: true,
                                ishorizontalalignment: false,
                            },
                        },

                        answers: [{
                            options: sequence.map((optId, i) => ({
                                optionid: optId,
                                orderid: i + 1,
                                score: 2,
                            })),
                        }],

                        hints: { hint1: "", hint2: "", hint3: "" },
                        passageid: null,
                    },
                };
            } else if (finalType === "FIBDnD") {
                return {
                    productguid: finalProductGuid,
                    organizationguid: finalOrgGuid,
                    assetguids: [],
                    question: {
                        questionguid: "00000000-0000-0000-0000-000000000000",
                        questioncode: `FIBDnD-${index + 1}`,
                        questiontext: `<p>${questionText}</p>`,
                        questiontype: "FIBDnD",
                        repositoryguid: finalRepoGuid,
                        questionlevelid: getDifficultyId(finalDifficulty),
                        maxscore: 0,
                        answeringtime: 0,
                        classification: "None",
                        metadata: [],
                        feedback: {
                            isquestionfeedback: false,
                            ischoicefeedback: false,
                        },
                        language: "English",

                        data: {
                            blanks: [{
                                blankid: 1,
                                blankguid: "00000000-0000-0000-0000-000000000000",
                            }, ],
                            options: choices,
                            preferences: {
                                shuffle: true,
                                ishorizontalalignment: true,
                            },
                        },

                        answers: [{
                            blankid: 1,
                            options: choices.map((c) => ({
                                optionid: c.choiceid,
                                score: correct.includes(c.choiceid) ? 2 : 0,
                                iscorrect: correct.includes(c.choiceid),
                                negativescore: 0,
                            })),
                        }, ],

                        hints: { hint1: "", hint2: "", hint3: "" },
                        passageid: null,
                    },
                };
            } else if (finalType === "FIBDD") {
                return {
                    productguid: finalProductGuid,
                    organizationguid: finalOrgGuid,
                    assetguids: [],
                    question: {
                        questionguid: "00000000-0000-0000-0000-000000000000",
                        repositoryguid: finalRepoGuid,
                        questioncode: `FIBDD-${index + 1}`,
                        questiontext: `<p>${questionText}</p>`,
                        questiontype: "FIBDD",
                        questionlevelid: getDifficultyId(finalDifficulty),
                        answeringtime: 0,
                        classification: "None",
                        language: "English",
                        metadata: [],
                        feedback: {
                            isquestionfeedback: false,
                            ischoicefeedback: false,
                        },

                        data: {
                            blanks: [{
                                blankid: 1,
                                blankguid: "00000000-0000-0000-0000-000000000000",
                                options: choices,
                            }, ],
                            preferences: {
                                ishorizontalalignment: true,
                                shuffle: true,
                            },
                        },

                        answers: [{
                            blankid: 1,
                            options: choices.map((o) => ({
                                optionid: o.optionid,
                                score: correct.includes(o.optionid) ? 2 : 0,
                                iscorrect: correct.includes(o.optionid),
                            })),
                        }, ],

                        hints: { hint1: "", hint2: "", hint3: "" },
                        passageid: null,
                    },
                };
            } else if (finalType === "FIBT") {
                return {
                    productguid: finalProductGuid,
                    organizationguid: finalOrgGuid,
                    assetguids: [],
                    question: {
                        questionguid: "00000000-0000-0000-0000-000000000000",
                        repositoryguid: finalRepoGuid,
                        questioncode: `FIBT-${index + 1}`,
                        questiontext: `<p>${questionText}</p>`,
                        questiontype: "FIBT",
                        questionlevelid: getDifficultyId(finalDifficulty),
                        language: "English",
                        metadata: [],
                        feedback: { isquestionfeedback: false, ischoicefeedback: false },

                        data: {
                            blanks: [{
                                blankid: 1,
                                blankguid: "00000000-0000-0000-0000-000000000000",
                            }],
                        },

                        answers: [{
                            blankid: 1,
                            answers: correct.map((ans) => ({
                                answertext: ans,
                                score: 2,
                                iscorrect: true,
                            })),
                        }],

                        hints: { hint1: "", hint2: "", hint3: "" },
                        passageid: null,
                    },
                };
            } else {
                return {
                    productguid: finalProductGuid,
                    organizationguid: finalOrgGuid,
                    assetguids: [],
                    question: {
                        repositoryguid: finalRepoGuid,
                        questionguid: "00000000-0000-0000-0000-000000000000",
                        questioncode: `Item-${finalType}-${index + 1 + 100}`,
                        questiontext: `<p>${questionText}</p>`,
                        questiontype: finalType,
                        questionlevel: finalDifficulty,
                        questionlevelid: getDifficultyId(finalDifficulty),
                        answeringtime: 0,
                        classification: "None",
                        language: "English",
                        metadata: [],
                        feedback: { isquestionfeedback: false, ischoicefeedback: false },
                        data: {
                            choices,
                            preferences: {
                                ishorizontalalignment: true,
                                shuffle: finalType !== "TF",
                                minchoices: finalType === "MRQ" ? 2 : undefined,
                                maxchoices: finalType === "MRQ" ? 3 : undefined,
                            },
                        },
                        answers: choices.map((c) => ({
                            choiceid: c.choiceid,
                            score: correct.includes(c.choiceid) ? 2 : 0,
                            iscorrect: correct.includes(c.choiceid),
                        })),
                        hints: { hint1: "", hint2: "", hint3: "" },
                        passageid: null,
                    },
                };
            }

        });

        res.json({ questions });
    } catch (error) {
        console.error("OpenRouter AI ERROR:", error.message);
        res.status(500).json({ error: "AI generation failed" });
    }
});

// -------------------------------
app.listen(5000, () =>
    console.log("✅ OpenRouter AI server running on port 5000"),
);