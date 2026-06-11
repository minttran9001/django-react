import { CourtCenterSearchFormValues } from "@/features/auth/schemas/courtCenterSearchSchema";
import FiltersForm from "./FiltersForm";

const FiltersContainer = () => {
    const onSubmit = (data: CourtCenterSearchFormValues) => {
        console.log(data);
    }

    return (
        <div>
            <FiltersForm onSubmit={onSubmit} />
        </div>
    )
}

export default FiltersContainer;