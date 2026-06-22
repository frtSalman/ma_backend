import Users from './user.model.js';
import Invitation from './invitation.model.js';
import Homework from './homework.model.js';
import Timetable from './timeTable.model.js';
import StatEntry from './statistic.model.js';
import UnsolvedQuestion from './unsolvedQuesiton.model.js';
import Solution from './solution.model.js';
import Exam from './exam.model.js';
import Cirriculum from './cirriculum.model.js';
import StudentBookProgress from './studentBookProgress.model.js';
import StudentVideos from './studentVideos.model.js';
import StudentVideoQuestions from './studentVideoQuestions.model.js';

const models = {
    Users,
    Invitation,
    Homework,
    Timetable,
    StatEntry,
    UnsolvedQuestion,
    Solution,
    Exam,
    Cirriculum,
    StudentBookProgress,
    StudentVideos,
    StudentVideoQuestions,
};

Object.values(models).forEach(model => {
    if (typeof model.associate === 'function') {
        model.associate(models);
    }
});

export default models;
