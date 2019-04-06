const express = require('express');
const bodyParser = require('body-parser');

const PORT = 8080;
const QUESTIONS_PER_QUIZ = 10;

const questions = require('./questions');
const quizes = {};
let id = 1;
console.log(`Loaded ${questions.length} questions`);

const app = express();
app.use(bodyParser.json());
app.post('/quiz', startQuiz);
app.get('/quiz/:quizId/question', getQuestionForQuiz);
app.post('/quiz/:quizId/answer', answerQuestionForQuiz);
app.get('/quiz/:quizId/score', getQuizScore);
app.use(endpointNotFound);
app.listen(PORT, onServerStarted);

function onServerStarted() {
    console.log(`Server listening on port ${PORT}`);
}

function startQuiz(request, response) {
    const quizId = id++;
    quizes[quizId] = {
        questions: randomizeQuestions(QUESTIONS_PER_QUIZ),
        current: 0,
        points: 0,
    };
    response.send({ id: quizId });
}

function getQuestionForQuiz(request, response) {
    const quizId = request.params.quizId;
    const quiz = quizes[quizId];
    if (!quiz) {
        response.status(404).send(`Quiz with id ${quizId} does not exist`);
        return;
    }
    const question = quiz.questions[quiz.current];
    if (question) {
        response.send({ name: question.name });
    } else {
        response.status(400).send('No more questions in the quiz!');
    }
}

function answerQuestionForQuiz(request, response) {
    const quizId = request.params.quizId;
    const quiz = quizes[quizId];
    if (!quiz) {
        response.status(404).send(`Quiz with id ${quizId} does not exist`);
        return;
    }

    const answerJson = request.body;
    const answer = answerJson.answer;
    if (answer !== 0 && answer !== 1) {
        response.status(400).send('Invalid answer format');
        return;
    }

    if (quiz.current >= quiz.questions.length) {
        response.status(400).send(`No questions to answer in this quiz`);
        return;
    }
    const question = quiz.questions[quiz.current];
    const details = { name: question.name, url: question.url, type: question.type };

    quiz.current++;
    if (question.type === answer) {
        quiz.points++;
        response.send({ correct: true, details });
    } else {
        response.send({ correct: false, details });
    }
}

function getQuizScore(request, response) {
    const quizId = request.params.quizId;
    const quiz = quizes[quizId];

    if (!quiz) {
        response.status(404).send(`Quiz with id ${quizId} does not exist`);
        return;
    }

    response.send({ score: quiz.points });
}

function randomizeQuestions(count) {
    return questions.sort(() => 0.5 - Math.random()).slice(0, count);
}

function endpointNotFound(request, response, next) {
    response.status(404).send(`Enpoint ${request.method} ${request.url} does not exist`);
}
