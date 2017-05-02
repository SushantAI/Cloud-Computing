
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Collections;

// Websockets
import javax.websocket.OnClose;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

// Maaping USERNAME_KEY = "username" -> person 
@ServerEndpoint(value = "/chat")
public class MyWebSocketEndPoint {

	//private static final String USERNAME_KEY = "username";
	// SC - This map is taken static because all the persons need to be shown in the list, hence we dont want to create a separate instance every time
	private static Map<String, Session> persons = Collections.synchronizedMap(new LinkedHashMap<String, Session>());
	
	@OnOpen
	public void onOpen(Session session) throws Exception {

	    //Get the new socket's username from url
	    //e.g. url: ws://localhost:8080/chat?username=Andi, so Andi is the username
	    Map<String, List<String>> parameter = session.getRequestParameterMap();
	    List<String> list = parameter.get("person");
	    String addPerson = list.get(0);
	    System.out.println(addPerson);
	    //Add the new socket to the collection
	    persons.put(addPerson, session);

	    //also set username property of the session.
	    //so when there a new message from a particular socket's session obj
	    //we can get the username whom send the message
	    session.getUserProperties().put("person", addPerson);

	    //Give a list current online users to the new socket connection
	    //because we store username as the key of the map, we can get all
	    //  username list from the map's keySet
	    String reply = "newUser|" + String.join("|", persons.keySet());
	    session.getBasicRemote().sendText(reply);

	    //Loop through all socket's session obj, then send a text message
	    for (Session slave : persons.values()) {
	        if(slave == session) continue;
	        slave.getBasicRemote().sendText("newUser|" + addPerson);
	    }
	}

	@OnMessage
	public void onMessage(Session session, String message) throws Exception {
	    //Extract the information of incoming message.
	    //Message format: 'From|Message'
	    //so we split the incoming message with '|' token
	    //to get the destination and message content data
	    String[] msg = message.split("\\|");
	    String receiver = msg[0]; String msgBody = msg[1];

	    //Retrieve the sender's username from it's property
	    String sender = (String)session.getUserProperties().get("person");

	    //Deliver the message according to the destination
	    //Outgoing Message format: "message|sender|content|messageType?"
	    //the message type is optional, if the message is intended to be broadcast
	    //  then the message type value is "|all"
	    if(receiver.equals("all")) {
	        //if the destination chat is 'all', then we broadcast the message
	        for (Session client : persons.values()) {
	            if(client.equals(session)) continue;
	            client.getBasicRemote().sendText("message|" + sender + "|" + msgBody + "|all" );
	        }
	    } else {
	        //find the username to be sent, then deliver the message
	        Session slave = persons.get(receiver);
	        String reply = "message|" + sender + "|" + msgBody;
	        slave.getBasicRemote().sendText(reply);
	    }
	}

	@OnClose
	public void onClose(Session session) throws Exception {
	    //remove client from collecton  
	    String username = (String)session.getUserProperties().get("person");
	    persons.remove(username);
	    
	    //broadcast to all people, that the current user is leaving the chat room
	    for (Session slave : persons.values()) {
	        slave.getBasicRemote().sendText("removeUser|" + username);
	    }
	}
}
