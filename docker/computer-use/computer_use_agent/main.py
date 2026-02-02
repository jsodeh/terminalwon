"""
Computer-Use Agent Main Module

This agent:
1. Connects to TerminalWON hub via WebSocket
2. Receives chat continuation requests
3. Uses Anthropic computer-use to interact with IDE
4. Captures screenshots and sends responses back
"""

import asyncio
import json
import os
import base64
import logging
from datetime import datetime
from typing import Optional, Dict, Any

import anthropic
import websockets
from PIL import Image
import subprocess

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


class ComputerUseAgent:
    """Agent that uses computer-use to continue IDE conversations."""
    
    def __init__(self):
        self.api_key = os.environ.get("ANTHROPIC_API_KEY")
        self.hub_url = os.environ.get("TERMINALWON_HUB_URL", "ws://localhost:3002")
        self.client: Optional[anthropic.Anthropic] = None
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.running = False
        self.current_task: Optional[Dict[str, Any]] = None
        
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable required")
        
        self.client = anthropic.Anthropic(api_key=self.api_key)
        logger.info("Computer-Use Agent initialized")
    
    async def connect(self):
        """Connect to TerminalWON hub."""
        logger.info(f"Connecting to hub: {self.hub_url}")
        
        try:
            self.ws = await websockets.connect(self.hub_url)
            
            # Authenticate
            await self.ws.send(json.dumps({
                "type": "auth",
                "payload": {
                    "tool": "computer-use-agent",
                    "platform": "docker",
                    "apiKey": "computer-use-agent-key"
                },
                "timestamp": datetime.now().isoformat(),
                "messageId": f"auth-{datetime.now().timestamp()}"
            }))
            
            # Wait for auth response
            response = await asyncio.wait_for(self.ws.recv(), timeout=10)
            auth_result = json.loads(response)
            
            if auth_result.get("type") == "authenticated":
                logger.info("Successfully authenticated with hub")
                return True
            else:
                logger.error(f"Authentication failed: {auth_result}")
                return False
                
        except Exception as e:
            logger.error(f"Connection failed: {e}")
            return False
    
    async def take_screenshot(self) -> Optional[str]:
        """Capture screen and return base64-encoded image."""
        try:
            screenshot_path = "/tmp/screenshot.png"
            
            # Use scrot for screenshot
            result = subprocess.run(
                ["scrot", "-o", screenshot_path],
                capture_output=True,
                timeout=5
            )
            
            if result.returncode != 0:
                logger.error(f"Screenshot failed: {result.stderr}")
                return None
            
            # Read and encode image
            with open(screenshot_path, "rb") as f:
                image_data = f.read()
            
            return base64.standard_b64encode(image_data).decode("utf-8")
            
        except Exception as e:
            logger.error(f"Screenshot error: {e}")
            return None
    
    async def execute_computer_action(self, action: Dict[str, Any]) -> bool:
        """Execute a computer-use action (click, type, etc.)."""
        action_type = action.get("type")
        
        try:
            if action_type == "mouse_move":
                x, y = action.get("x", 0), action.get("y", 0)
                subprocess.run(["xdotool", "mousemove", str(x), str(y)], timeout=2)
                
            elif action_type == "click":
                button = action.get("button", "1")
                subprocess.run(["xdotool", "click", str(button)], timeout=2)
                
            elif action_type == "type":
                text = action.get("text", "")
                subprocess.run(["xdotool", "type", "--", text], timeout=10)
                
            elif action_type == "key":
                key = action.get("key", "")
                subprocess.run(["xdotool", "key", key], timeout=2)
                
            else:
                logger.warning(f"Unknown action type: {action_type}")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Action execution error: {e}")
            return False
    
    async def continue_conversation(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Continue an IDE conversation using computer-use.
        
        Args:
            task: Contains sessionId, messages, instructions
            
        Returns:
            Result with response and any captured screenshots
        """
        session_id = task.get("sessionId")
        messages = task.get("messages", [])
        instructions = task.get("instructions", "")
        
        logger.info(f"Continuing conversation for session: {session_id}")
        
        # Take initial screenshot
        screenshot = await self.take_screenshot()
        
        if not screenshot:
            return {"error": "Failed to capture screen", "success": False}
        
        # Build conversation for Claude
        system_prompt = f"""You are a computer-use agent helping to continue an IDE chat conversation.

The user was in the middle of a conversation in their IDE, and needs you to:
{instructions or 'Help them complete their task based on the conversation context.'}

You can see the IDE screen and interact with it using computer-use tools.
Try to understand the context and provide helpful actions.

Previous conversation:
{json.dumps(messages[-10:], indent=2) if messages else 'No previous messages'}
"""

        try:
            # Use computer-use beta
            response = self.client.beta.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": screenshot
                            }
                        },
                        {
                            "type": "text",
                            "text": "Here is the current IDE screen. Please analyze and help continue the conversation."
                        }
                    ]
                }],
                tools=[
                    {
                        "type": "computer_20241022",
                        "name": "computer",
                        "display_width_px": 1920,
                        "display_height_px": 1080,
                        "display_number": 1
                    }
                ],
                betas=["computer-use-2024-10-22"]
            )
            
            # Process tool use if any
            result_text = ""
            actions_taken = []
            
            for content in response.content:
                if content.type == "text":
                    result_text += content.text
                elif content.type == "tool_use":
                    # Execute the computer action
                    tool_input = content.input
                    action_result = await self.execute_computer_action(tool_input)
                    actions_taken.append({
                        "action": tool_input,
                        "success": action_result
                    })
                    await asyncio.sleep(0.5)  # Brief pause between actions
            
            return {
                "success": True,
                "sessionId": session_id,
                "response": result_text,
                "actionsTaken": actions_taken,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Conversation continuation error: {e}")
            return {"error": str(e), "success": False}
    
    async def handle_message(self, message_str: str):
        """Handle incoming message from hub."""
        try:
            message = json.loads(message_str)
            msg_type = message.get("type")
            
            if msg_type == "agent.chat.continue":
                # Handle chat continuation request
                task = message.get("payload", {})
                result = await self.continue_conversation(task)
                
                # Send result back
                await self.ws.send(json.dumps({
                    "type": "agent.chat.continue.result",
                    "payload": result,
                    "timestamp": datetime.now().isoformat(),
                    "messageId": f"result-{datetime.now().timestamp()}"
                }))
                
            elif msg_type == "ping":
                await self.ws.send(json.dumps({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                }))
                
            else:
                logger.debug(f"Unhandled message type: {msg_type}")
                
        except Exception as e:
            logger.error(f"Message handling error: {e}")
    
    async def run(self):
        """Main run loop."""
        self.running = True
        
        while self.running:
            try:
                if not self.ws or self.ws.closed:
                    success = await self.connect()
                    if not success:
                        await asyncio.sleep(5)
                        continue
                
                # Listen for messages
                async for message in self.ws:
                    await self.handle_message(message)
                    
            except websockets.exceptions.ConnectionClosed:
                logger.warning("Connection closed, reconnecting...")
                await asyncio.sleep(2)
            except Exception as e:
                logger.error(f"Run loop error: {e}")
                await asyncio.sleep(5)
    
    async def shutdown(self):
        """Graceful shutdown."""
        logger.info("Shutting down agent...")
        self.running = False
        
        if self.ws:
            await self.ws.close()


async def main():
    """Entry point."""
    logger.info("Starting TerminalWON Computer-Use Agent")
    
    agent = ComputerUseAgent()
    
    try:
        await agent.run()
    except KeyboardInterrupt:
        await agent.shutdown()
    finally:
        logger.info("Agent stopped")


if __name__ == "__main__":
    asyncio.run(main())
