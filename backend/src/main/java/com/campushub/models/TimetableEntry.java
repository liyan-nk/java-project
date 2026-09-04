package com.campushub.models;

import com.google.gson.annotations.SerializedName;

public class TimetableEntry {
    private int id;
    private int userId;
    private String dayOfWeek;

    @SerializedName(value = "subject", alternate = {"subjectName"})
    private String subject;

    @SerializedName(value = "room", alternate = {"classroom"})
    private String room;

    private String startTime;
    private String endTime;
    private String instructor;

    public TimetableEntry() {
    }

    public TimetableEntry(int id, int userId, String dayOfWeek, String subject, String room, String startTime, String endTime, String instructor) {
        this.id = id;
        this.userId = userId;
        this.dayOfWeek = dayOfWeek;
        this.subject = subject;
        this.room = room;
        this.startTime = startTime;
        this.endTime = endTime;
        this.instructor = instructor;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    public String getDayOfWeek() {
        return dayOfWeek;
    }

    public void setDayOfWeek(String dayOfWeek) {
        this.dayOfWeek = dayOfWeek;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getSubjectName() {
        return subject;
    }

    public void setSubjectName(String subjectName) {
        this.subject = subjectName;
    }

    public String getRoom() {
        return room;
    }

    public void setRoom(String room) {
        this.room = room;
    }

    public String getClassroom() {
        return room;
    }

    public void setClassroom(String classroom) {
        this.room = classroom;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public String getInstructor() {
        return instructor;
    }

    public void setInstructor(String instructor) {
        this.instructor = instructor;
    }
}
