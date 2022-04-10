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
import {  YfTeam, YfGame, TeamGameLine } from './YfTypes';

// Confidence threshold for string matching; if it's not past 50%, reject the match
const confidenceThreshold = 0.5;

// How many n-grams to look at. Team names can be pretty short, so by the documentation from
// https://www.npmjs.com/package/string-similarity-js we'll go with 1 as the substring length.
const similaritySubstringLength = 1;

export type Result<T> = { success: true, result: T} | {success: false, error: string };

export function importGame(teams: YfTeam[], qbjString: string): Result<YfGame> {
    // Parse this as a QBJ MODAQ file. Should we include MODAQ in here?
    // We need the existing tournament to see what teams and players we can match with. If the match is too bad, we need
    // to return something saying that the import failed (YfGame or string? Result?)
    const qbj: IMatch = JSON.parse(qbjString);

    if (qbj.match_teams == undefined || qbj.match_teams.length !== 2) {
        return createFailure("QBJ file doesn't have two teams specified");
    }

    const firstTeamCandidate: LikeliestTeam = getLikeliestTeam(teams, qbj.match_teams[0].team.name);
    if (firstTeamCandidate.confidence < confidenceThreshold) {
        return createFailure(`Couldn't find the first team in the QBJ file in the tournament: '${qbj.match_teams[0].team.name}'`);
    }

    const secondTeamCandidate: LikeliestTeam = getLikeliestTeam(teams, qbj.match_teams[1].team.name);
    if (secondTeamCandidate.confidence < confidenceThreshold) {
        return createFailure(`Couldn't find second team in the QBJ file in the tournament: '${qbj.match_teams[1].team.name}'`);
    }

    // Calculate TUH
    const tuhtot: number = qbj.tossups_read;

    // Fill in player lines. Make method, go through each player, and see if we can find a match. If we can't... fail
    // for now.

    // Go through and calculate bounceback points
    const bbPts1: number = qbj.match_teams[0].bonus_bounceback_points ?? 0;
    const bbPts2: number = qbj.match_teams[1].bonus_bounceback_points ?? 0;

    // TODO: Use this with team and player name similarities. Can sort them by how close they are, and throw an error
    // if no team is close enough (50% threshold?)

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

    // Potential issue: ottu, ot etc are unknown, since the format isn't included in the game format
    const game: YfGame = {
        bbPts1,
        bbPts2,
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
        team1: firstTeamCandidate.team.teamName,
        team2: secondTeamCandidate.team.teamName,
        tiebreaker: false,
        tuhtot, 
    };
    return createSuccess(game);
}

function createFailure<T>(error: string): Result<T> {
    return {
        success: false,
        error
    };
}

function createSuccess<T>(value: T): Result<T> {
    return {
        success: true,
        result: value
    };
}

function getPlayerLines(team: YfTeam, matchPlayers: IMatchPlayer[]): Result<TeamGameLine> {
    const playerNames: string[] = Object.keys(team.roster);
    const line: TeamGameLine = {}
    for (const matchPlayer of matchPlayers) {
        // Doing likeliest player matches like this is O(n^2), but n should be small here (< 10)
        const matchPlayerName: string = matchPlayer.player.name;
        const playerNameResult: LikeliestPlayer = getLikeliestPlayer(playerNames, matchPlayerName);
        if (playerNameResult.confidence < confidenceThreshold) {
            return createFailure(`Couldn't find player with name '${matchPlayerName}' on team '${team.teamName}'`);
        } else if (line[playerNameResult.playerName] != undefined) {
            return createFailure(`Duplicate player '${matchPlayerName}' on team '${team.teamName}'`);
        }

        // TODO: iterate through answer counts and classify them as negs, zeros, gets, powers
        // Can rely on heuristics, or need to look at tournament settings? < 0 = negs, == 10 = 10s, > 10 = powers
        // Would want to change it if supporting superpowers
        line[playerNameResult.playerName] = {
            negs: 0,
            powers: 0,
            tens: 0,
            tuh: matchPlayer.tossups_heard
        };
    }

    createSuccess(line);
}

// TODO: Should we just return a result, and do the confidence check here?
function getLikeliestPlayer(playerNames: string[], candidateName: string) : LikeliestPlayer {
    let result: LikeliestPlayer = { playerName: playerNames[0], confidence: 0 };
    for (const playerName of playerNames) {
        const confidence: number = StringSimilarity.stringSimilarity(playerName, candidateName, similaritySubstringLength);
        if (confidence > result.confidence) {
            result = {
                playerName,
                confidence
            };
        }
    }

    return result;
}

function getLikeliestTeam(teams: YfTeam[], teamName: string): LikeliestTeam {
    let result: LikeliestTeam = { team: teams[0], confidence: 0 };
    for (const team of teams) {
        const confidence: number = StringSimilarity.stringSimilarity(team.teamName, teamName, similaritySubstringLength);
        if (confidence > result.confidence) {
            result = {
                team,
                confidence
            };
        }
    }

    return result;
}



type LikeliestPlayer = { playerName: string, confidence: number };
type LikeliestTeam = { team: YfTeam, confidence: number};

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
