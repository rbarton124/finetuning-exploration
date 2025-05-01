import json, os, time
from pathlib import Path
from openai import OpenAI

client = OpenAI()
MODEL_BASE   = "gpt-4o-mini"
EPOCHS       = 3
SUFFIX       = "itins"

def upload(path: str) -> str:
    resp = client.files.create(file=open(path, "rb"), purpose="fine-tune")
    return resp.id

def create_ft_job(train_file_id: str, valid_file_id: str) -> str:
    job = client.fine_tuning.jobs.create(
        model=MODEL_BASE,
        training_file=train_file_id,
        validation_file=valid_file_id,
        suffix=SUFFIX,
        hyperparameters={"n_epochs": EPOCHS},
    )
    print("Launched:", job.id)
    return job.id

def tail(job_id: str):
    while True:
        job   = client.fine_tuning.jobs.retrieve(job_id)
        evts  = client.fine_tuning.jobs.list_events(job_id, limit=5)
        print("status:", job.status, "| last evt:", evts.data[0].message)
        if job.status in {"succeeded", "failed", "cancelled"}:
            print("Finished with status:", job.status)
            if job.status == "succeeded":
                print("Your tuned model is:", job.fine_tuned_model)
            break
        time.sleep(30)

if __name__ == "__main__":
    train_id = upload("data/train.jsonl")
    valid_id = upload("data/val.jsonl")
    job_id   = create_ft_job(train_id, valid_id)
    tail(job_id)
