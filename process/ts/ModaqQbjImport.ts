/**
 * ModaqQbjImport.ts
 * Alejandro Lopez-Lago
 *
 * Import logic for QBJ files produced by MODAQ
 * QBJ: https://schema.quizbowl.technology/
 * MODAQ: https://github.com/alopezlago/MODAQ/
 */

// Modaq doesn't include round infomration in the QBJ file, so that needs to be added form a dialog
// Unsure if anything else would be needed, but it does mean we need a React component
// Also need a menu item, which opens the Open Dialog. Having to specify a round means we can't do a mass import...

// One alternative is to have it as an add button... but you have the same round issue

// We need to convert the QBJ items into YfTypes, then put them somewhere. Benefit is there's no need for scoring rules,
// we assume it's the same

// Other challenge: need to map it to YellowFruit teams. We could use Team names, but we need to ensure that player
// names are also the same. Need to do a type of join.

// Need to
// - Parse JSON QBJ into something we understand (add interface), and take in a round number
// - Translate that into Yf types
// - Do a join/lookup to make sure that the teams and players exist, and that there are no typos (and warn the user if
//   there are typos)
// - Get the round from somewhere... maybe the UI? Can assume it is 0 now. Problem is you can't add games for the same
//       teams that have duplicate rounds.
//     - Alternative is for MODAQ to include the round number, although that might not be part of QBJ?
//     - It's not part of https://schema.quizbowl.technology/match, but it could help with imports.
//     - Export to QBJ doesn't include something for fields. Would have to be from New Game or passed in as a prop.

// Idea: pull information from QBJ file, then open up the New Game with the best guesses filled in (teams, player scores)

import StringSimilarity = require('string-similarity-js');
import StatUtils = require('./StatUtils');
import {  YfTeam, YfGame, TeamGameLine } from './YfTypes';

export function importGame(teams: YfTeam[], qbjString: string): { success: true, game: YfGame} | {success: false, error: string }  {
    // Parse this as a QBJ MODAQ file. Should we include MODAQ in here?
    // We need the existing tournament to see what teams and players we can match with. If the match is too bad, we need
    // to return something saying that the import failed (YfGame or string? Result?)
    const qbj: QbjMatch = JSON.parse(qbjString);

    // return { success: false, error: "Unknown" };
    // TODO: Use this with team and player name similarities. Can sort them by how close they are, and throw an error
    // if no team is close enough (50% threshold?)
    var x = StringSimilarity.stringSimilarity("aaa", "aab");
    console.log(x);

    // Need to get actual players, because null confuses new game.
    const players1: TeamGameLine = {};
    for (const player of Object.keys(teams[0].roster))
    {
        players1[player] = { tuh: 0, negs: 0, powers: 0, tens: 0 };
    }

    const players2: TeamGameLine = {};
    for (const player of Object.keys(teams[1].roster))
    {
        players2[player] = { tuh: 0, negs: 0, powers: 0, tens: 0 };
    }

    return {
        success: true,
        game: {
            bbPts1: 0,
            bbPts2: 0,
            forfeit: false,
            lightningPts1: 0,
            lightningPts2: 0,
            notes: '',
            otNeg1: 0,
            otNeg2: 0,
            otPwr1: 0,
            otPwr2: 0,
            otTen1: 0,
            otTen2: 0,
            ottu: 0,
            phases: [],
            players1,
            players2,
            round: 0,
            score1: 100,
            score2: 50,
            team1: teams[0].teamName,
            team2: teams[1].teamName,
            tiebreaker: false,
            tuhtot: 0,
        }
    }
}


// Taken from https://github.com/alopezlago/MODAQ/blob/master/src/qbj/QBJ.ts 
interface IMatch {
    tossups_read: number;
    overtime_tossups_read?: number; //(leave empty for now, until formats are more integrated)
    match_teams: IMatchTeam[];
    match_questions: IMatchQuestion[];
    notes?: string; // For storing protest info and thrown out Qs
    packets?: string; // The name of the packet
}

interface ITeam {
    name: string;
    players: IPlayer[];
}

interface IPlayer {
    name: string;
}

interface IMatchTeam {
    team: ITeam;
    bonus_points: number;
    bonus_bounceback_points?: number;
    match_players: IMatchPlayer[];
    lineups: ILineup[]; // Lineups seen. New entries happen when there are changes in the lineup
}

interface IMatchPlayer {
    player: IPlayer;
    tossups_heard: number;
    answer_counts: IPlayerAnswerCount[];
}

interface IPlayerAnswerCount {
    number: number;
    answer: IAnswerType;
}

interface ILineup {
    first_question: number; // Which question number this lineup heard first
    players: IPlayer[];
    // could eventually do reason if we have formats restrict when subs occur
}

interface IAnswerType {
    value: number; // # of points
    // Could include label for neg/no penalty/get/power/etc.
}

interface IMatchQuestion {
    question_number: number; // The cycle, starts at 1
    tossup_question: IQuestion;
    replacement_tossup_question?: IQuestion; // multiple replacement tossups not currently supported
    buzzes: IMatchQuestionBuzz[];
    bonus?: IMatchQuestionBonus;
    replacement_bonus?: IMatchQuestionBonus; // multiple replacements not currently supported
}

interface IQuestion {
    question_number: number; // number of question in packet
    type: "tossup" | "bonus" | "lightning";
    parts: number; // 1 for tossup, n for bonuses
}

interface IMatchQuestionBuzz {
    team: ITeam;
    player: IPlayer;
    buzz_position: IBuzzPosition;
    result: IAnswerType;
}

interface IBuzzPosition {
    word_index: number; // 0-indexed
}

interface IMatchQuestionBonus {
    question?: IQuestion;
    parts: IMatchQuestionBonusPart[];
}

interface IMatchQuestionBonusPart {
    controlled_points: number;
    bounceback_points?: number;
}
