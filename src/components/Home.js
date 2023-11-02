import React, { useEffect, useState } from "react";
import "./Home.css";
import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useIsAuthenticated,
} from "@azure/msal-react";
import axios from "axios";
import { useMsal } from "@azure/msal-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

const Home = () => {
  const isAuthenticated = useIsAuthenticated();
  const [query, setQuery] = useState(
    "Let me know what spring vegetable recipes you recommend."
  );

  const [responseText, setResponseText] = useState("");
  const { instance } = useMsal();
  const [cog_token, setCogToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function acquireOpenAIToken() {
      try {
        const account = instance.getAllAccounts()[0];
        if (!account) {
          throw new Error("User not logged in.");
        }

        const tokenRequest = {
          //   scopes: [process.env.REACT_APP_APP_SCOPE], // https://cognitiveservices.azure.com/.default is default value for using managed identity
          scopes: process.env.REACT_APP_APIM_BASE_URL
            ? [process.env.REACT_APP_APP_SCOPE]
            : ["https://cognitiveservices.azure.com/.default"],
          account: account,
        };

        console.log("tokenRequest", tokenRequest);

        try {
          const response = await instance.acquireTokenSilent(tokenRequest);
          console.log("response", response);
          setCogToken(response.accessToken);
          return response.accessToken;
        } catch (error) {
          console.error("Error acquiring token:", error);
          throw error;
        }
      } catch (error) {
        console.error(
          "Error acquiring OpenAI token or calling ChatCompletion API:",
          error
        );
      }
    }
    acquireOpenAIToken();
  }, [isAuthenticated]);

  const requestOpenAiChat = async () => {
    if (!cog_token) return;

    //switch url depending on if you are using APIM or not
    const apiUrl = process.env.REACT_APP_APIM_BASE_URL
      ? `${process.env.REACT_APP_APIM_BASE_URL}/deployments/${process.env.REACT_APP_OPEN_AI_MODEL_NAME}/chat/completions?api-version=${process.env.REACT_APP_OPEN_AI_API_VERSION}`
      : `https://${process.env.REACT_APP_OPEN_AI_SUBDOMAIN}.openai.azure.com/openai/deployments/${process.env.REACT_APP_OPEN_AI_MODEL_NAME}/completions?api-version=${process.env.REACT_APP_OPEN_AI_API_VERSION}`;
    //const apiUrl = `${process.env.REACT_APP_OPEN_AI_BASE_URL}/chat/completions?api-version=${process.env.REACT_APP_OPEN_AI_API_VERSION}`;
    //const apiUrl = `${process.env.REACT_APP_APIM_BASE_URL}/deployments/${process.env.REACT_APP_OPEN_AI_MODEL_NAME}/chat/completions?api-version=${process.env.REACT_APP_OPEN_AI_API_VERSION}`;
    console.log(
      "REACT_APP_OPEN_AI_SUBDOMAIN",
      process.env.REACT_APP_OPEN_AI_SUBDOMAIN
    );
    console.log("apiUrl", apiUrl);
    const headers = {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key":
        process.env.REACT_APP_OPEN_AI_SUBSCRIPTION_KEY,
      Authorization: `${cog_token}`,
    };
    const data = {
      messages: [
        {
          role: "system",
          content: "Please be sure to end the word with Meow",
        },
        {
          role: "user",
          content: query,
        },
      ],
      temperature: 0.5,
      max_tokens: 800,
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: null,
    };

    try {
      setIsLoading(true);
      const response = await axios.post(apiUrl, data, { headers });
      setIsLoading(false);
      setResponseText(response.data.choices[0].message.content);
    } catch (error) {
      setIsLoading(false);
      console.error("Error calling ChatCompletion API:", error);
    }
  };

  return (
    <div className="homePage">
      <UnauthenticatedTemplate>
        <h5 className="unauthmessage">Log In</h5>
      </UnauthenticatedTemplate>

      <AuthenticatedTemplate>
        <div className="postContainer">
          <h1>Open AI Chat Demo</h1>
          <div className="inputPost">
            <div>Include what you would like to hear</div>
            <input
              type="text"
              placeholder="Give me a recipe for spring vegetables you recommend."
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="postButton" onClick={requestOpenAiChat}>
            Posted
          </button>

          <div className="inputPost">
            <div>Reply from Open AI</div>
            <div className="responseTextWrapper">
              <textarea
                type="text"
                placeholder="A response will be displayed."
                value={responseText}
                readOnly
              />
              {isLoading && (
                <div className="loading-icon">
                  <FontAwesomeIcon icon={faSpinner} spin size="3x" />
                </div>
              )}
            </div>
          </div>
        </div>
      </AuthenticatedTemplate>
    </div>
  );
};

export default Home;
