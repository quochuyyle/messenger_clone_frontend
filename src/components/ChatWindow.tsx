import { useMutation, useQuery, useSubscription } from "@apollo/client";
import { useEffect, useRef, useState } from "react";
import {
  GetMessagesForChatroomQuery,
  GetUsersOfChatroomQuery,
  LiveUsersInChatroomSubscription,
  Message,
  NewMessageSubscription,
  SendMessageMutation,
  User,
  UserStartedTypingMutationMutation,
  UserStartedTypingSubscription,
  UserStoppedTypingSubscription,
} from "../gql/graphql";
import { SEND_MESSAGE } from "../graphql/mutations/SendMessage";
import { useParams } from "react-router-dom";
import { useUserStore } from "../stores/userStore";
import { USER_STARTED_TYPING_SUBSCRIPTION } from "../graphql/subscriptions/UserStartedTyping";
import { USER_STOPPED_TYPING_SUBSCRIPTION } from "../graphql/subscriptions/UserStoppedTyping";
import { USER_STARTED_TYPING_MUTATION } from "../graphql/mutations/UserStartedTypingMutation";
import { USER_STOPPED_TYPING_MUTATION } from "../graphql/mutations/UserStoppedTypingMutation";
import { useDropzone } from "react-dropzone";
import { useMediaQuery } from "@mantine/hooks";
import { LIVE_USERS_SUBSCRIPTION } from "../graphql/subscriptions/LiveUsers";
import { ENTER_CHATROOM } from "../graphql/mutations/EnterChatroom";
import { LEAVE_CHATROOM } from "../graphql/mutations/LeaveChatroom";
import { GET_CHATROOMS_FOR_USER } from "../graphql/queries/GetChatroomsForUser";
import {
  Avatar,
  Card,
  Divider,
  Flex,
  List,
  ScrollArea,
  Text,
  Tooltip,
  Image,
  Button,
  TextInput,
} from "@mantine/core";
import OverlappingAvatars from "./OverlappingAvatars";
import { GET_USERS_OF_CHATROOM } from "../graphql/queries/GetUsersOfChatroom";
import { GET_MESSAGES_FOR_CHATROOM } from "../graphql/queries/GetMessagesForChatroom";
import MessageBubble from "./MessageBubble";
import { IconMichelinBibGourmand } from "@tabler/icons-react";
import { NEW_MESSAGE_SUBSCRIPTION } from "../graphql/subscriptions/NewMessage";

const ChatWindow = () => {
  const [messageContent, setMessageContent] = useState<string>("");
  const [sendMessage, { data: sendMessageData }] =
    useMutation<SendMessageMutation>(SEND_MESSAGE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];

      if (file) {
        setSelectedFile(file);
      }
    },
  });

  const previewUrl = selectedFile ? URL.createObjectURL(selectedFile) : null;
  const { id } = useParams<{ id: string }>();
  const user = useUserStore((state) => state);
  const {
    data: typingData,
    loading: typingLoading,
    error: typingError,
  } = useSubscription<UserStartedTypingSubscription>(
    USER_STARTED_TYPING_SUBSCRIPTION,
    {
      variables: {
        chatroomId: parseInt(id!),
        userId: user.id,
      },
    }
  );

  const {
    data: stoppedTypingData,
    loading: stoppedTypingLoading,
    error: stoppedTypingError,
  } = useSubscription<UserStoppedTypingSubscription>(
    USER_STOPPED_TYPING_SUBSCRIPTION,
    {
      variables: {
        chatroomId: parseInt(id!),
        userId: user.id,
      },
    }
  );

  const [
    userStartedTypingMutation,
    {
      data: dataStartedTyping,
      loading: loadingStartedTyping,
      error: errorStartedTyping,
    },
  ] = useMutation<UserStartedTypingMutationMutation>(
    USER_STARTED_TYPING_MUTATION,
    {
      variables: {
        chatroomId: parseInt(id!),
      },
      onCompleted: () => {
        console.log("User started typing");
      },
    }
  );

  const [
    userStoppedTypingMutation,
    {
      data: dataStoppedTyping,
      loading: loadingStoppedTyping,
      error: errorStoppedTyping,
    },
  ] = useMutation<UserStartedTypingMutationMutation>(
    USER_STOPPED_TYPING_MUTATION,
    {
      variables: {
        chatroomId: parseInt(id!),
      },
      onCompleted: () => {
        console.log("User started typing");
      },
    }
  );

  const [typingUsers, setTypingUsers] = useState<User[]>([]);
  useEffect(() => {
    const user = typingData?.userStartedTyping;
    if (user && user.id) {
      setTypingUsers((prevUsers) => {
        if (!prevUsers.find((u) => u.id === user.id)) {
          return [...prevUsers, user];
        }

        return prevUsers;
      });
    }
  }, [typingData]);

  const typingTimeoutRef = useRef<{ [key: number]: NodeJS.Timeout }>({});
  useEffect(() => {
    const user = stoppedTypingData?.userStoppedTyping;
    if (user && user.id) {
      clearTimeout(typingTimeoutRef.current[user.id]);
      setTypingUsers((prevUsers) => prevUsers.filter((u) => u.id !== user.id));
    }
  }, [stoppedTypingData]);

  const userId = useUserStore((state) => state.id);
  const handleUserStartedTyping = async () => {
    await userStartedTypingMutation();
    if (userId && typingTimeoutRef.current[userId]) {
      clearTimeout(typingTimeoutRef.current[userId]);
    }

    if (userId) {
      typingTimeoutRef.current[userId] = setTimeout(async () => {
        setTypingUsers((prevUsers) =>
          prevUsers.filter((user) => user.id !== userId)
        );
        await userStoppedTypingMutation();
      }, 5000);
    }
  };

  const isSmallDevice = useMediaQuery("(max-width: 768px)");
  const {
    data: liveUsersData,
    loading: liveUsersLoading,
    error: liveUsersError,
  } = useSubscription<LiveUsersInChatroomSubscription>(
    LIVE_USERS_SUBSCRIPTION,
    {
      variables: {
        chatroomId: parseInt(id!),
      },
    }
  );

  const [liveUsers, setLiveUsers] = useState<User[]>([]);

  useEffect(() => {
    if (liveUsersData?.liveUsersInChatroom) {
      setLiveUsers(liveUsersData?.liveUsersInChatroom);
    }
  }, [liveUsersData?.liveUsersInChatroom]);

  const [enterChatroom] = useMutation(ENTER_CHATROOM);
  const [leaveChatroom] = useMutation(LEAVE_CHATROOM);
  const chatroomId = parseInt(id!);

  const handleEnter = async () => {
    await enterChatroom({
      variables: {
        chatroomId,
      },
    })
      .then((response) => {
        if (response.data.enterChatroom) {
          console.log("Successfully entered chatroom!");
        }
      })
      .catch((error) => {
        console.log("Error entering chatroom: ", error);
      });
  };

  const handleLeave = async () => {
    await leaveChatroom({
      variables: {
        chatroomId,
      },
    })
      .then((response) => {
        if (response.data.leaveChatroom) {
          console.log("Successfully entered chatroom!");
        }
      })
      .catch((error) => {
        console.log("Error entering chatroom: ", error);
      });
  };

  const [isUserPartOfChatroom, setIsUserPartOfChatroom] =
    useState<() => boolean | undefined>();

  const { data: dataUsersOfChatroom } = useQuery<GetUsersOfChatroomQuery>(
    GET_USERS_OF_CHATROOM,
    {
      variables: {
        chatroomId: chatroomId,
      },
    }
  );

  useEffect(() => {
    setIsUserPartOfChatroom(() =>
      dataUsersOfChatroom?.getUsersOfChatroom.some((user) => user.id === userId)
    );
  }, [dataUsersOfChatroom?.getUsersOfChatroom, userId]);

  useEffect(() => {
    handleEnter();
    if (liveUsersData?.liveUsersInChatroom) {
      setLiveUsers(liveUsersData.liveUsersInChatroom);
      setIsUserPartOfChatroom(() =>
        dataUsersOfChatroom?.getUsersOfChatroom.some(
          (user) => user.id === userId
        )
      );
    }
  }, [chatroomId]);

  useEffect(() => {
    window.addEventListener("beforeunload", handleLeave);
    return () => {
      window.removeEventListener("beforeunload", handleLeave);
    };
  }, []);

  useEffect(() => {
    handleEnter();
    if (liveUsersData?.liveUsersInChatroom) {
      setLiveUsers(liveUsersData.liveUsersInChatroom);
    }

    return () => {
      handleLeave();
    };
  }, [chatroomId]);

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  const { data, loading, error } = useQuery<GetMessagesForChatroomQuery>(
    GET_MESSAGES_FOR_CHATROOM,
    {
      variables: {
        chatroomId: chatroomId,
      },
    }
  );

  const [messages, setMessages] = useState<Message[]>([]);
  useEffect(() => {
    if (data?.getMessagesForChatroom) {
      setMessages(data.getMessagesForChatroom);
    }
  }, [data?.getMessagesForChatroom]);

  const handleSendMessage = async () => {
    await sendMessage({
      variables: {
        chatroomId: chatroomId,
        content: messageContent,
        image: selectedFile,
      },
      refetchQueries: [
        {
          query: GET_CHATROOMS_FOR_USER,
          variables: {
            userId,
          },
        },
      ],
    });

    setMessageContent("");
    setSelectedFile(null);
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current;
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const uniqueMessages = Array.from(
      new Set(data?.getMessagesForChatroom.map((m) => m.id))
    ).map((id) => data?.getMessagesForChatroom.find((m) => m.id === id));

    setMessages(uniqueMessages as Message[]);
    scrollToBottom();
  }, [data?.getMessagesForChatroom]);

  const {
    data: dataSub,
    loading: loadingSub,
    error: errorSub,
  } = useSubscription<NewMessageSubscription>(NEW_MESSAGE_SUBSCRIPTION, {
    variables: {
      chatroomId: chatroomId,
    },
  });

  useEffect(() => {
    scrollToBottom();
    if (dataSub?.newMessage) {
      if (!messages.find((m) => m.id === dataSub?.newMessage.id)) {
        setMessages((prevMessages) => [...prevMessages, dataSub?.newMessage]);
      }
    }
  }, [dataSub?.newMessage, messages]);

  return (
    <Flex
      justify={"center"}
      ml={isSmallDevice ? "100px" : "0"}
      w={isSmallDevice ? "calc(100vw - 100px)" : "1000px"}
      h={"100vh"}
    >
      {!liveUsersLoading && isUserPartOfChatroom ? (
        <Card withBorder shadow="xl" p="0" w="100%">
          <Flex direction="column" pos="relative" h="100%" w="100%">
            <Flex direction="column" bg="#f1f1f0">
              <Flex
                direction="row"
                justify="space-around"
                align="center"
                my="sm"
              >
                <Flex direction="column" align="start">
                  <Text mb="xs" c="dimmed" italic>
                    Chat width
                  </Text>
                  {dataUsersOfChatroom?.getUsersOfChatroom && (
                    <OverlappingAvatars
                      users={dataUsersOfChatroom.getUsersOfChatroom}
                    />
                  )}
                </Flex>
                <Flex direction="column" justify="space-around" align="start">
                  <List w="150">
                    <Text mb="xs" c="dimmed">
                      Live users
                    </Text>
                    {liveUsersData?.liveUsersInChatroom?.map((user) => (
                      <Flex
                        key={user.id}
                        pos="relative"
                        w={25}
                        h={25}
                        my={"xs"}
                      >
                        <Avatar radius={"xl"} size={25} src={user?.avatarUrl} />
                        <Flex
                          pos="absolute"
                          bottom={0}
                          right={0}
                          w={10}
                          h={10}
                          bg="green"
                          style={{ borderRadius: 10 }}
                        ></Flex>
                        <Text ml={"sm"} style={{ whiteSpace: "nowrap" }}>
                          {user.fullname}
                        </Text>
                      </Flex>
                    ))}
                  </List>
                </Flex>
              </Flex>
              <Divider size={"sm"} w={"100%"} />
            </Flex>
            <ScrollArea
              viewportRef={scrollAreaRef}
              h={"70vh"}
              offsetScrollbars
              type="always"
              w={"100%"}
              p={"md"}
            >
              {loading ? (
                <Text italic c="dimmed">
                  Loading...
                </Text>
              ) : (
                messages.map((message) => {
                  return (
                    <MessageBubble
                      key={message?.id}
                      message={message}
                      currentUserId={userId}
                    />
                  );
                })
              )}
            </ScrollArea>
            <Flex
              style={{
                width: "100%",
                position: "absolute",
                bottom: 0,
                background: "#f1f1f0",
              }}
              direction="column"
              bottom={0}
              align="start"
            >
              <Divider size={"sm"} w={"100%"} />
              <Flex
                w={"100%"}
                mx={"md"}
                my={"xs"}
                align={"center"}
                justify={"center"}
                direction={"column"}
                pos={"relative"}
                p={"sm"}
              >
                <Flex
                  pos={"absolute"}
                  bottom={50}
                  direction="row"
                  align={"center"}
                  bg={"#f1f1f0"}
                  style={{
                    borderRadius: 5,
                    boxShadow: "0px 0px 5px 0px #000000",
                  }}
                  p={typingUsers.length === 0 ? 0 : "sm"}
                >
                  <Avatar.Group>
                    {typingUsers.map((user) => (
                      <Tooltip key={user.id} label={user.fullname}>
                        <Avatar radius={"xl"} src={user?.avatarUrl}></Avatar>
                      </Tooltip>
                    ))}
                  </Avatar.Group>

                  {typingUsers.length > 0 && (
                    <Text italic c="dimmed">
                      is typing...
                    </Text>
                  )}
                </Flex>
                <Flex
                  w={"100%"}
                  mx={"md"}
                  px={"md"}
                  align="center"
                  justify={"center"}
                >
                  <Flex {...getRootProps()} align="center" id="11111">
                    {selectedFile && (
                      <Image
                        mr="md"
                        width={"50"}
                        height={"50"}
                        src={previewUrl}
                        alt="Preview"
                        radius={"md"}
                      />
                    )}
                    <Button>{<IconMichelinBibGourmand />}</Button>
                    <input {...getInputProps()} />
                  </Flex>
                  <TextInput
                    onKeyDown={handleUserStartedTyping}
                    style={{ flex: 0.7 }}
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Type your message"
                    rightSection={
                      <Button
                        onClick={handleSendMessage}
                        color="blue"
                        leftIcon={<IconMichelinBibGourmand />}
                      >
                        Send
                      </Button>
                    }
                  />
                </Flex>
              </Flex>
            </Flex>
          </Flex>
        </Card>
      ) : (
        <></>
      )}
    </Flex>
  );
};

export default ChatWindow;
