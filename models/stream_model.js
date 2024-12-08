
class SteamModel {
    constructor(socket, insertId, streamId, host, streamType) {
        this.socket = socket;
        this.insertId = insertId;
        this.host = host;
        this.hostId = host.userObject.id;
        this.streamId = streamId;
        this.streamType = streamType;
        this.viewersCount = 0;
        this.viewers = [];
        this.hosts = [];
        this.guests = [];
        this.addHost(host);
    }

    async endStream() {
        this.socket.to(this.streamId).emit("onStreamListener", {
            "error": false,
            "type": "stream_ended",
        });
        console.log("%d stream has been ended", this.streamId);
    }

    addHost(host) {
        this.hosts.push({
            client: host,
        });
        console.log('%s host added on this stream', host.userObject.name);
    }

    toggleCamera(userId, value) {
        for (let i = 0; i < this.hosts.length; i++) {
            const element = this.hosts[i];
            if (element.client.userObject.id == userId) {
                // This is the incoming host
                element.client.camera = value; // Enable/Disable camera
                if (value) {
                    console.log(element.client.userObject.name, " enabled its camera");
                } else {
                    console.log(element.client.userObject.name, " disabled its camera");
                }
                this.socket.to(this.streamId).emit("onStreamListener", {
                    "error": false,
                    "type": "camera_audio_update",
                    "user": {
                        "id": element.client.userObject.id,
                        "camera": element.client.camera,
                        "audio": element.client.audio,
                    },
                });
            }
        }
    }

    toggleMicrophone(userId, value) {
        for (let i = 0; i < this.hosts.length; i++) {
            const element = this.hosts[i];
            if (element.client.userObject.id == userId) {
                // This is the incoming host
                element.client.audio = value; // Enable/Disable camera
                if (value) {
                    console.log(element.client.userObject.name, " enabled its microphone");
                } else {
                    console.log(element.client.userObject.name, " disabled its microphone");
                }
                this.socket.to(this.streamId).emit("onStreamListener", {
                    "error": false,
                    "type": "camera_audio_update",
                    "user": {
                        "id": element.client.userObject.id,
                        "camera": element.client.camera ?? (this.streamType == 2 ? false : true),
                        "audio": element.client.audio,
                    },
                });
            }
        }
    }

    acceptGuest(client, guestId) {
        if (client.userObject.id == this.hostId) {
            for (let i = 0; i < this.guests.length; i++) {
                const element = this.guests[i];
                if (element.client.userObject.id == guestId) {
                    this.guests.splice(i, 1);
                    element.client.camera = this.streamType == 2 ? false : true;
                    element.client.audio = true;
                    this.addHost(element.client);
                    // console.log(this.hosts);
                    console.log("%s guest is now a host of stream: %d", element.client.userObject.name, this.streamId);
                    this.socket.to(this.streamId).emit("onStreamListener", {
                        "error": false,
                        "type": "hosts_updated",
                        "user": {
                            "id": element.client.userObject.id,
                            "name": element.client.userObject.name,
                            "picture": element.client.userObject.profilePicture,
                            "camera": element.client.camera ?? (this.streamType == 2 ? false : true),
                            "audio": element.client.audio ?? true,
                        },
                    });
                    break;
                }
            }
        }
    }

    requestGuest(client) {
        this.guests.push({
            client: client
        });
        this.host.emit("onGuestListener", {
            "error": false,
            "type": "request_received",
            "user": {
                "id": client.userObject.id,
                "name": client.userObject.name,
                "picture": client.userObject.profilePicture,
            },
        });
        client.emit("onGuestListener", {
            "error": false,
            "type": "request_sent",
        });
        console.log('%s viewer added on this stream', client.userObject.name);
    }

    removeHostRequest(userId, element, i) {
        // const element = this.getHost(hostId);
        if (element) {
            if (userId == this.hostId || userId == element.client.userObject.id) {
                this.hosts.splice(i, 1);
                element.client.emit("onStreamListener", {
                    "error": false,
                    "type": "request_cancelled",
                });
                this.socket.to(this.streamId).emit("onStreamListener", {
                    "error": false,
                    "type": "host_removed",
                    "user": {
                        "id": element.client.userObject.id,
                        "name": element.client.userObject.name,
                    },
                });

            }
        }
        // for (let i = 0; i < this.hosts.length; i++) {
        //     const element = this.hosts[i];
        //     if (userId == this.hostId || userId == element.client.userObject.id) {
        //         this.hosts.splice(i, 1);
        //         this.element.client.emit("onStreamListener", {
        //             "error": false,
        //             "type": "request_cancelled",
        //         });
        //         this.socket.to(this.streamId).emit("onStreamListener", {
        //             "error": false,
        //             "type": "host_removed",
        //             "user": {
        //                 "id": element.client.userObject.id,
        //                 "name": element.client.userObject.name,
        //             },
        //         });
        //         break;
        //     }
        // }
    }

    cancelGuestRequest(userId, element, i) {
        // const element = this.getGuest(guestId);
        if (element) {
            if (userId == this.hostId || userId == element.client.userObject.id) {
                this.guests.splice(i, 1);
                element.client.emit("onStreamListener", {
                    "error": false,
                    "type": "request_cancelled",
                });
                this.socket.to(this.streamId).emit("onStreamListener", {
                    "error": false,
                    "type": "host_removed",
                    "user": {
                        "id": element.client.userObject.id,
                        "name": element.client.userObject.name,
                    },
                });
            }
        }

        // for (let i = 0; i < this.guests.length; i++) {
        //     const element = this.guests[i];
        //     if (userId == this.hostId || userId == element.client.userObject.id) {
        //         if (element.client.userObject.id == guestId) {
                    
        //             break;
        //         }
        //     }
        // }
    }

    getGuest(guestId) {
        for (let i = 0; i < this.guests.length; i++) {
            const element = this.guests[i];
            if (element.client.userObject.id == guestId) {
                return {e: element, i: i};
            }
        }
        return null;
    }

    getHost(hostId) {
        for (let i = 0; i < this.hosts.length; i++) {
            const element = this.hosts[i];
            if (element.client.userObject.id == hostId) {
                return {e: element, i: i};
            }
        }
        return null;
    }

    cancelRequest(userId, guestId) {
        var user = this.getGuest(guestId);
        if (user) {
            return this.cancelGuestRequest(userId, user.e, user.i);
        } else {
            user = this.getHost(guestId);
            return this.removeHostRequest(userId, user.e, user.i);
        }
        return null;
    }

    addViewer(viewerObj) {
        this.viewers.push({
            client: viewerObj,
        });
        this.viewersCount++;
        viewerObj.join(this.streamId);
        this.socket.to(this.streamId).emit("onStreamListener", {
            "error": false,
            "type": "user_joined",
            "viewersCount": this.viewersCount,
            "user": {
                "id": viewerObj.userObject.id,
                "name": viewerObj.userObject.name,
                "picture": viewerObj.userObject.profilePicture,
            },
        });
        console.log('%s viewer added on this stream', viewerObj.userObject.name);
    }

    removeViewer(host) {
        for (let i = 0; i < this.viewers.length; i++) {
            const element = this.viewers[i];
            if (element.client.userObject.id == host.userObject.id) {
                this.viewers.splice(i, 1);
                this.viewersCount--;
                console.log('%s viewer left this stream', element.client.userObject.name);
                this.socket.to(this.streamId).emit("onStreamListener", {
                    "error": false,
                    "type": "user_exit",
                    "viewersCount": this.viewersCount,
                    "user": {
                        "id": element.client.userObject.id,
                        "name": element.client.userObject.name,
                        "picture": element.client.userObject.profilePicture,
                    },
                });
                break;
            }
        }
    }

    get viewersList() {
        return this.viewers;
    }

    get totalViewers() {
        return this.viewersCount;
    }

    // streamType,
    // viewersCount,
    // viewers: [],
    // hosts: [],
    // hostId,
    get getJSON() {
        return {
            streamType: this.streamType,
            streamId: this.streamId,
            viewersCount: this.viewersCount,
            hostId: this.hostId,
            hosts: this.hosts.map((item) => {
                return {
                    id: item.client.userObject.id,
                    name: item.client.userObject.name,
                    picture: item.client.userObject.profilePicture,
                    levelXP: item.client.userObject.levelXP,
                    camera: item.client.camera ?? (this.streamType == 2 ? false : true),
                    audio: item.client.audio ?? true,
                };
            }),
            viewers: this.viewers.map((item) => {
                return {
                    id: item.client.userObject.id,
                    name: item.client.userObject.name,
                    picture: item.client.userObject.profilePicture,
                    levelXP: item.client.userObject.levelXP,
                };
            }),
        };
    }
}
module.exports = SteamModel;
