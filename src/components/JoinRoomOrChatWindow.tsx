import React, { ReactNode, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ChatWindow from "./ChatWindow";
import { Flex, Text } from "@mantine/core";

const JoinRoomOrChatWindow = () => {
  const { id } = useParams<{ id: string }>();

  const [content, setContent] = useState<string | ReactNode>("");

  useEffect(() => {
    if (!id) {
      setContent("Please choose a room");
    } else {
      setContent(<ChatWindow />);
    }
  }, [setContent, id]);

  return (
    <Flex w="100%" h="100vh" align="center" justify="center">
      <Text ml={!id ? "xl" : "none"} size={!id ? "xl" : ""}>
        {content}
      </Text>
    </Flex>
  );
};

export default JoinRoomOrChatWindow;
