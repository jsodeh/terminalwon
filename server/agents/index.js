/**
 * Agents module index - exports all agent classes
 */

const { ClaudeClient } = require('./ClaudeClient');
const { TerminalAgent, ERROR_PATTERNS, IGNORE_PATTERNS } = require('./TerminalAgent');
const { IDEAgent } = require('./IDEAgent');

module.exports = {
    ClaudeClient,
    TerminalAgent,
    IDEAgent,
    ERROR_PATTERNS,
    IGNORE_PATTERNS
};
