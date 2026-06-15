import copy

import pytest
from fastapi.testclient import TestClient

from src.app import activities, app

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_activities():
    original = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(copy.deepcopy(original))


def test_get_activities_returns_activities():
    response = client.get("/activities")
    assert response.status_code == 200
    activities = response.json()
    assert isinstance(activities, dict)
    assert "Chess Club" in activities
    assert "Programming Class" in activities


def test_signup_participant_adds_participant():
    email = "newstudent@example.com"
    response = client.post(
        "/activities/Chess%20Club/signup?email=newstudent%40example.com"
    )
    assert response.status_code == 200
    assert response.json()["message"] == f"Signed up {email} for Chess Club"

    activities = client.get("/activities").json()
    assert email in activities["Chess Club"]["participants"]


def test_duplicate_signup_returns_400():
    email = "duplicate@example.com"
    first = client.post(
        "/activities/Chess%20Club/signup?email=duplicate%40example.com"
    )
    assert first.status_code == 200

    second = client.post(
        "/activities/Chess%20Club/signup?email=duplicate%40example.com"
    )
    assert second.status_code == 400
    assert second.json()["detail"] == "Student already signed up for this activity"


def test_remove_participant_unregisters_participant():
    email = "remove-me@example.com"
    signup = client.post(
        "/activities/Chess%20Club/signup?email=remove-me%40example.com"
    )
    assert signup.status_code == 200

    response = client.delete(
        "/activities/Chess%20Club/participants?email=remove-me%40example.com"
    )
    assert response.status_code == 200
    assert response.json()["message"] == f"Removed {email} from Chess Club"

    activities = client.get("/activities").json()
    assert email not in activities["Chess Club"]["participants"]


def test_remove_missing_participant_returns_404():
    response = client.delete(
        "/activities/Chess%20Club/participants?email=absent%40example.com"
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Participant not found in this activity"
