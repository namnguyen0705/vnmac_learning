import { ActivityStepFields } from "./ActivityStepFields";
import { CheckStepFields } from "./CheckStepFields";
import { CompleteStepFields } from "./CompleteStepFields";
import { GenericStepFields } from "./GenericStepFields";
import { IntroStepFields } from "./IntroStepFields";
import { ReinforceStepFields } from "./ReinforceStepFields";
import type { StepFieldsProps } from "./StepFieldTypes";
import { VideoStepFields } from "./VideoStepFields";

export function StepContentFields(props: StepFieldsProps) {
  switch (props.step.key) {
    case "intro":
      return <IntroStepFields {...props} />;
    case "video":
      return <VideoStepFields {...props} />;
    case "activity":
      return <ActivityStepFields {...props} />;
    case "reinforce":
      return <ReinforceStepFields {...props} />;
    case "check":
      return <CheckStepFields {...props} />;
    case "complete":
      return <CompleteStepFields {...props} />;
    default:
      return <GenericStepFields {...props} />;
  }
}
